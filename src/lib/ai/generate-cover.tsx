import { ImageResponse } from "next/og";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import { uploadPublicFile, getPresignedDownloadUrl, BUCKET } from "@/lib/storage";
import { renderPdfFirstPageAsPng } from "@/lib/pdf-to-image";

interface CoverImageData {
  title: string;
  organizationName: string;
  organizationLogo?: string;
  tags: string[];
  brandPrimary: string;
}

export async function renderCoverImage(data: CoverImageData): Promise<Buffer> {
  const titleFontSize = data.title.length > 80 ? 32 : data.title.length > 50 ? 40 : 48;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Top: org branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: data.brandPrimary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {data.organizationName[0]?.toUpperCase() || "D"}
          </div>
          <span style={{ fontSize: 18, color: "#6b7280", fontWeight: 500 }}>
            {data.organizationName}
          </span>
        </div>

        {/* Middle: title + tags */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.2,
              maxWidth: "90%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.title.length > 120 ? data.title.slice(0, 117) + "..." : data.title}
          </div>

          {data.tags.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {data.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    backgroundColor: `${data.brandPrimary}18`,
                    color: data.brandPrimary,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: accent bar + branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: 80,
              height: 4,
              borderRadius: 2,
              backgroundColor: data.brandPrimary,
            }}
          />
          <span style={{ fontSize: 14, color: "#9ca3af" }}>doc1.ai</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateAndUploadCover(
  documentId: string
): Promise<string> {
  await connectDB();

  const doc = await DocumentModel.findById(documentId)
    .select("title tags brandOverride organizationId shortId sourceFile")
    .lean();

  if (!doc) throw new Error("Document not found");

  let imageBuffer: Buffer | null = null;

  // Try rendering PDF first page
  if (doc.sourceFile?.mimeType === "application/pdf" && doc.sourceFile?.url) {
    try {
      const urlPath = new URL(doc.sourceFile.url).pathname;
      const storageKey = urlPath.startsWith(`/${BUCKET}/`)
        ? urlPath.slice(`/${BUCKET}/`.length)
        : urlPath.slice(1);
      const downloadUrl = await getPresignedDownloadUrl(storageKey);
      const fileResponse = await fetch(downloadUrl);
      const pdfBuffer = Buffer.from(await fileResponse.arrayBuffer());
      imageBuffer = renderPdfFirstPageAsPng(pdfBuffer);
    } catch (error) {
      console.error("PDF cover rendering failed, falling back to text cover:", error);
    }
  }

  // Fallback to text-based cover
  if (!imageBuffer) {
    const org = await Organization.findById(doc.organizationId)
      .select("name logo brandColors")
      .lean();

    const brandPrimary =
      doc.brandOverride?.primary ||
      (org as { brandColors?: { primary?: string } })?.brandColors?.primary ||
      "#0062EB";

    imageBuffer = await renderCoverImage({
      title: doc.title || "Untitled Document",
      organizationName: (org as { name?: string })?.name || "Organisatie",
      organizationLogo: (org as { logo?: string })?.logo,
      tags: doc.tags || [],
      brandPrimary,
    });
  }

  const storageKey = `covers/${doc.shortId}.png`;
  const coverUrl = await uploadPublicFile(storageKey, imageBuffer, "image/png");

  await DocumentModel.findByIdAndUpdate(documentId, {
    $set: { coverImageUrl: coverUrl },
  });

  return coverUrl;
}
