import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { getPresignedDownloadUrl, BUCKET } from "@/lib/storage";
import { uploadPublicFile } from "@/lib/storage";
import { extractText } from "./extract-text";
import { analyzeAudience, type AudienceAnalysis } from "./analyze-audience";
import { analyzeContent } from "./analyze-content";
import { generateLanguageLevelSummaries } from "./generate-summary";
import { extractTerms } from "./extract-terms";
import { generateAndUploadCover } from "./generate-cover";
import { generateDisplayTitle } from "./generate-display-title";
import type { DocumentLanguage } from "./language";
import { vectorizeDocument } from "./vectorize-document";
import { detectVisualPages, extractVisualContent, type VisualContent, type VisualExtractionResult } from "./extract-visual-content";
import { renderPages, renderAllPages } from "./render-pdf-pages";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";

type ProgressCallback = (step: string, percentage: number) => Promise<void>;

/** Atomic update helper — avoids Mongoose VersionError from concurrent modifications.
 *  Throws if the document no longer exists (e.g. deleted mid-processing). */
async function updateDoc(documentId: string, fields: Record<string, unknown>) {
  const result = await DocumentModel.findByIdAndUpdate(documentId, { $set: fields });
  if (!result) {
    throw new Error(`Document ${documentId} was deleted during processing`);
  }
}

export async function processDocument(
  documentId: string,
  onProgress?: ProgressCallback
) {
  await connectDB();

  const doc = await DocumentModel.findById(documentId).lean();
  if (!doc) throw new Error("Document not found");

  const lang: DocumentLanguage = (doc.language as DocumentLanguage) || "nl";
  const targetLevel = doc.targetCEFRLevel as "B1" | "B2" | "C1" | "C2" | undefined;

  try {
    // Update status
    await updateDoc(documentId, { status: "processing" });

    // Step 1: Text extraction
    await onProgress?.("text-extraction", 10);
    await updateDoc(documentId, {
      "processingProgress.step": "text-extraction",
      "processingProgress.percentage": 10,
    });

    // Extract storage key from URL and use presigned download
    const urlPath = new URL(doc.sourceFile.url).pathname;
    const storageKey = urlPath.startsWith(`/${BUCKET}/`)
      ? urlPath.slice(`/${BUCKET}/`.length)
      : urlPath.slice(1);
    const downloadUrl = await getPresignedDownloadUrl(storageKey);
    const fileResponse = await fetch(downloadUrl);
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const { text, pageCount, pageLabelOffset } = await extractText(buffer, doc.sourceFile.mimeType);

    await updateDoc(documentId, {
      "content.originalText": text,
      ...(pageCount ? { pageCount } : {}),
      ...(pageLabelOffset !== undefined ? { pageLabelOffset } : {}),
    });

    // Step 1b: Visual content extraction (PDF only)
    let visualContent: VisualContent[] = [];
    const pageImageUrls = new Map<number, string>();
    const highResPageImageUrls = new Map<number, string>();
    const isPdf = doc.sourceFile.mimeType === "application/pdf";

    if (isPdf && pageCount && pageCount > 0) {
      try {
        await onProgress?.("visual-extraction", 15);
        await updateDoc(documentId, {
          "processingProgress.step": "visual-extraction",
          "processingProgress.percentage": 15,
        });

        // Render ALL pages as thumbnails (72 DPI) and upload to S3
        // This enables page image previews in chat for every source reference
        const allPageBuffers = await renderAllPages(buffer, 72);

        for (let i = 0; i < allPageBuffers.length; i++) {
          const pageNum = i + 1; // 1-based physical
          const key = `documents/${documentId}/pages/page-${pageNum}.png`;
          const url = await uploadPublicFile(key, allPageBuffers[i], "image/png");
          pageImageUrls.set(pageNum, url);
        }

        // Detect pages with visual content (tables, charts, diagrams)
        const visualPageIndices = await detectVisualPages(buffer, pageCount);

        if (visualPageIndices.length > 0) {
          // Extract detailed visual content descriptions + 150 DPI renders
          const extraction: VisualExtractionResult = await extractVisualContent(buffer, visualPageIndices);
          visualContent = extraction.content;

          // Upload 150 DPI high-res renders for visual pages to S3
          // These are shown in chat instead of the blurry 72 DPI thumbnails
          for (const [pageIdx, pngBuffer] of extraction.pageRenders) {
            const pageNum = pageIdx + 1; // Convert 0-based to 1-based
            const key = `documents/${documentId}/pages/page-${pageNum}-hires.png`;
            const url = await uploadPublicFile(key, pngBuffer, "image/png");
            highResPageImageUrls.set(pageNum, url);
          }

          await updateDoc(documentId, {
            visualContentExtracted: true,
            visualChunkCount: visualContent.length,
            visualContent: visualContent.map((vc) => ({
              pageNumber: vc.pageIndex + 1, // Store as physical page (1-based), apply offset at display time
              contentType: vc.contentType,
              description: vc.description,
            })),
          });
        } else {
          await updateDoc(documentId, { visualContentExtracted: false });
        }
      } catch (err) {
        console.error("Visual extraction failed (non-blocking):", err);
        await updateDoc(documentId, { visualContentExtracted: false });
      }
    }

    // Step 1c: Vectorize document (chunk + store in Pinecone)
    await onProgress?.("vectorization", 20);
    await updateDoc(documentId, {
      "processingProgress.step": "vectorization",
      "processingProgress.percentage": 20,
    });

    try {
      const chunkCount = await vectorizeDocument(
        doc._id.toString(),
        text,
        doc.language || "nl",
        pageCount,
        visualContent.length > 0 ? visualContent : undefined,
        pageImageUrls.size > 0 ? pageImageUrls : undefined,
        highResPageImageUrls.size > 0 ? highResPageImageUrls : undefined,
        pageLabelOffset || 0
      );
      await updateDoc(documentId, { vectorized: true, chunkCount });
    } catch (err) {
      console.error("Vectorization failed (non-blocking):", err);
      await updateDoc(documentId, { vectorized: false });
    }

    // Step 2: Audience analysis (pre-processing)
    await onProgress?.("audience-analysis", 25);
    await updateDoc(documentId, {
      "processingProgress.step": "audience-analysis",
      "processingProgress.percentage": 25,
    });

    let audienceContext: AudienceAnalysis | undefined;
    try {
      audienceContext = await analyzeAudience(text, lang);
      await updateDoc(documentId, {
        "audienceContext.documentType": audienceContext.documentType,
        "audienceContext.audience": audienceContext.audience,
        "audienceContext.isExternal": audienceContext.isExternal,
      });
    } catch (err) {
      console.error("Audience analysis failed (non-blocking):", err);
    }

    // Step 3: Content analysis
    await onProgress?.("content-analysis", 35);
    await updateDoc(documentId, {
      "processingProgress.step": "content-analysis",
      "processingProgress.percentage": 35,
    });

    const analysis = await analyzeContent(text, audienceContext, lang, targetLevel);

    const contentUpdate: Record<string, unknown> = {
      "content.summary": {
        original: analysis.summary,
        B1: "",
        B2: "",
        C1: "",
      },
      "content.keyPoints": analysis.keyPoints,
      "content.findings": analysis.findings,
    };
    if (analysis.languageLevel && ["B1", "B2", "C1", "C2"].includes(analysis.languageLevel)) {
      contentUpdate.languageLevel = analysis.languageLevel;
    } else if (!doc.languageLevel) {
      contentUpdate.languageLevel = "C1";
    }
    await updateDoc(documentId, contentUpdate);

    // Step 4: Summary generation (already done in analysis) + display title
    await onProgress?.("summary-generation", 50);
    await updateDoc(documentId, {
      "processingProgress.step": "summary-generation",
      "processingProgress.percentage": 50,
    });

    // Generate communicative display title if not already set
    if (!doc.displayTitle) {
      try {
        const displayTitle = await generateDisplayTitle(
          doc.title,
          analysis.summary,
          lang
        );
        await updateDoc(documentId, { displayTitle });
      } catch (err) {
        console.error("Display title generation failed (non-blocking):", err);
      }
    }

    // Step 5: Language level rewriting
    await onProgress?.("language-levels", 65);
    await updateDoc(documentId, {
      "processingProgress.step": "language-levels",
      "processingProgress.percentage": 65,
    });

    const levelSummaries = await generateLanguageLevelSummaries(
      analysis.summary,
      audienceContext,
      lang,
      targetLevel
    );
    await updateDoc(documentId, {
      "content.summary.B1": levelSummaries.B1,
      "content.summary.B2": levelSummaries.B2,
      "content.summary.C1": levelSummaries.C1,
    });

    // Step 6: Term extraction
    await onProgress?.("term-extraction", 80);
    await updateDoc(documentId, {
      "processingProgress.step": "term-extraction",
      "processingProgress.percentage": 80,
    });

    const terms = await extractTerms(text, lang, targetLevel);
    await updateDoc(documentId, { "content.terms": terms });

    // Step 7: Cover image generation (non-blocking)
    try {
      await onProgress?.("cover-generation", 90);
      await updateDoc(documentId, {
        "processingProgress.step": "cover-generation",
        "processingProgress.percentage": 90,
      });

      const coverUrl = await generateAndUploadCover(documentId);
      await updateDoc(documentId, { coverImageUrl: coverUrl });
    } catch (coverError) {
      console.error("Cover generation failed (non-blocking):", coverError);
    }

    // Step 8: Finalize
    await onProgress?.("finalizing", 95);
    await updateDoc(documentId, {
      "processingProgress.step": "finalizing",
      "processingProgress.percentage": 95,
    });

    await updateDoc(documentId, {
      status: "ready",
      "processingProgress.step": "finalizing",
      "processingProgress.percentage": 100,
      publishedAt: new Date(),
    });

    await onProgress?.("finalizing", 100);

    // Dispatch webhook event
    dispatchWebhookEvent(doc.organizationId.toString(), "document.processed", {
      documentId: doc._id.toString(),
      shortId: doc.shortId,
      title: doc.displayTitle || doc.title,
      status: "ready",
      slug: doc.slug,
    }).catch((err) => console.error("Webhook dispatch failed:", err));

    return await DocumentModel.findById(documentId).lean();
  } catch (error) {
    console.error("Document processing error:", error);
    await DocumentModel.findByIdAndUpdate(documentId, {
      $set: { status: "error" },
    }).catch(() => {});

    // Dispatch error webhook event
    dispatchWebhookEvent(doc.organizationId.toString(), "document.error", {
      documentId: doc._id.toString(),
      title: doc.title,
      error: (error as Error).message,
    }).catch(() => {});

    throw error;
  }
}
