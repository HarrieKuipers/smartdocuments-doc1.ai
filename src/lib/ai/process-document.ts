import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { getPresignedDownloadUrl, BUCKET } from "@/lib/storage";
import { extractText } from "./extract-text";
import { analyzeAudience, type AudienceAnalysis } from "./analyze-audience";
import { analyzeContent } from "./analyze-content";
import { generateLanguageLevelSummaries } from "./generate-summary";
import { extractTerms } from "./extract-terms";
import { generateAndUploadCover } from "./generate-cover";
import { generateDisplayTitle } from "./generate-display-title";
import type { DocumentLanguage } from "./language";
import { vectorizeDocument } from "./vectorize-document";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";

type ProgressCallback = (step: string, percentage: number) => Promise<void>;

export async function processDocument(
  documentId: string,
  onProgress?: ProgressCallback
) {
  await connectDB();

  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error("Document not found");

  const lang: DocumentLanguage = doc.language || "nl";
  const targetLevel = doc.targetCEFRLevel as "B1" | "B2" | "C1" | "C2" | undefined;

  try {
    // Update status
    doc.status = "processing";
    await doc.save();

    // Step 1: Text extraction
    await onProgress?.("text-extraction", 10);
    doc.processingProgress = { step: "text-extraction", percentage: 10 };
    await doc.save();

    // Extract storage key from URL and use presigned download
    const urlPath = new URL(doc.sourceFile.url).pathname;
    const storageKey = urlPath.startsWith(`/${BUCKET}/`)
      ? urlPath.slice(`/${BUCKET}/`.length)
      : urlPath.slice(1);
    const downloadUrl = await getPresignedDownloadUrl(storageKey);
    const fileResponse = await fetch(downloadUrl);
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const { text, pageCount } = await extractText(buffer, doc.sourceFile.mimeType);

    doc.content.originalText = text;
    if (pageCount) doc.pageCount = pageCount;
    await doc.save();

    // Step 1b: Vectorize document (chunk + store in Pinecone)
    await onProgress?.("vectorization", 15);
    doc.processingProgress = { step: "vectorization", percentage: 15 };
    await doc.save();

    try {
      const chunkCount = await vectorizeDocument(
        doc._id.toString(),
        text,
        doc.language || "nl",
        pageCount
      );
      doc.vectorized = true;
      doc.chunkCount = chunkCount;
      await doc.save();
    } catch (err) {
      console.error("Vectorization failed (non-blocking):", err);
      doc.vectorized = false;
      await doc.save();
    }

    // Step 1c: Audience analysis (pre-processing)
    await onProgress?.("audience-analysis", 20);
    doc.processingProgress = { step: "audience-analysis", percentage: 20 };
    await doc.save();

    let audienceContext: AudienceAnalysis | undefined;
    try {
      audienceContext = await analyzeAudience(text, lang);
      doc.audienceContext = {
        documentType: audienceContext.documentType,
        audience: audienceContext.audience,
        isExternal: audienceContext.isExternal,
      };
      await doc.save();
    } catch (err) {
      console.error("Audience analysis failed (non-blocking):", err);
    }

    // Step 2: Content analysis
    await onProgress?.("content-analysis", 30);
    doc.processingProgress = { step: "content-analysis", percentage: 30 };
    await doc.save();

    const analysis = await analyzeContent(text, audienceContext, lang, targetLevel);
    doc.content.summary = {
      original: analysis.summary,
      B1: "",
      B2: "",
      C1: "",
    };
    doc.content.keyPoints = analysis.keyPoints;
    doc.content.findings = analysis.findings;
    if (analysis.languageLevel && ["B1", "B2", "C1", "C2"].includes(analysis.languageLevel)) {
      doc.languageLevel = analysis.languageLevel;
    } else if (!doc.languageLevel) {
      // Fallback: default to C1 if AI did not return a valid language level
      doc.languageLevel = "C1";
    }
    await doc.save();

    // Step 3: Summary generation (already done in analysis) + display title
    await onProgress?.("summary-generation", 50);
    doc.processingProgress = { step: "summary-generation", percentage: 50 };
    await doc.save();

    // Generate communicative display title if not already set
    if (!doc.displayTitle) {
      try {
        const displayTitle = await generateDisplayTitle(
          doc.title,
          analysis.summary,
          lang
        );
        doc.displayTitle = displayTitle;
        await doc.save();
      } catch (err) {
        console.error("Display title generation failed (non-blocking):", err);
      }
    }

    // Step 4: Language level rewriting
    await onProgress?.("language-levels", 65);
    doc.processingProgress = { step: "language-levels", percentage: 65 };
    await doc.save();

    const levelSummaries = await generateLanguageLevelSummaries(
      analysis.summary,
      audienceContext,
      lang,
      targetLevel
    );
    doc.content.summary.B1 = levelSummaries.B1;
    doc.content.summary.B2 = levelSummaries.B2;
    doc.content.summary.C1 = levelSummaries.C1;
    await doc.save();

    // Step 5: Term extraction
    await onProgress?.("term-extraction", 80);
    doc.processingProgress = { step: "term-extraction", percentage: 80 };
    await doc.save();

    const terms = await extractTerms(text, lang, targetLevel);
    doc.content.terms = terms;
    await doc.save();

    // Step 6: Cover image generation (non-blocking)
    try {
      await onProgress?.("cover-generation", 90);
      doc.processingProgress = { step: "cover-generation", percentage: 90 };
      await doc.save();

      const coverUrl = await generateAndUploadCover(documentId);
      doc.coverImageUrl = coverUrl;
      await doc.save();
    } catch (coverError) {
      console.error("Cover generation failed (non-blocking):", coverError);
    }

    // Step 7: Finalize
    await onProgress?.("finalizing", 95);
    doc.processingProgress = { step: "finalizing", percentage: 95 };
    await doc.save();

    doc.status = "ready";
    doc.processingProgress = { step: "finalizing", percentage: 100 };
    doc.publishedAt = new Date();
    await doc.save();

    await onProgress?.("finalizing", 100);

    // Dispatch webhook event
    dispatchWebhookEvent(doc.organizationId.toString(), "document.processed", {
      documentId: doc._id.toString(),
      shortId: doc.shortId,
      title: doc.displayTitle || doc.title,
      status: "ready",
      slug: doc.slug,
    }).catch((err) => console.error("Webhook dispatch failed:", err));

    return doc;
  } catch (error) {
    console.error("Document processing error:", error);
    doc.status = "error";
    await doc.save();

    // Dispatch error webhook event
    dispatchWebhookEvent(doc.organizationId.toString(), "document.error", {
      documentId: doc._id.toString(),
      title: doc.title,
      error: (error as Error).message,
    }).catch(() => {});

    throw error;
  }
}
