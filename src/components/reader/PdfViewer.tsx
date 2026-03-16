"use client";

interface PdfViewerProps {
  shortId: string;
  brandPrimary?: string;
}

export default function PdfViewer({ shortId }: PdfViewerProps) {
  const pdfUrl = `/api/reader/${shortId}/pdf`;

  return (
    <div className="flex flex-col rounded-2xl bg-white shadow-sm overflow-hidden">
      <iframe
        src={pdfUrl}
        className="w-full border-0"
        style={{ height: "70vh" }}
        title="PDF viewer"
      />
    </div>
  );
}
