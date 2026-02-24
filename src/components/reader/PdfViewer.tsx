"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  shortId: string;
  brandPrimary?: string;
}

export default function PdfViewer({ shortId, brandPrimary }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  function goToPrevPage() {
    setPageNumber((p) => Math.max(1, p - 1));
  }

  function goToNextPage() {
    setPageNumber((p) => Math.min(numPages, p + 1));
  }

  function zoomIn() {
    setScale((s) => Math.min(2.0, s + 0.2));
  }

  function zoomOut() {
    setScale((s) => Math.max(0.4, s - 0.2));
  }

  // Use proxy API to avoid CORS issues with private S3 files
  const pdfUrl = `/api/reader/${shortId}/pdf`;

  return (
    <div className="flex flex-col rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[80px] text-center text-sm text-gray-600">
            {pageNumber} / {numPages || "..."}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={zoomOut}
            disabled={scale <= 0.4}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[40px] text-center text-xs text-gray-500">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={zoomIn}
            disabled={scale >= 2.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="overflow-auto bg-gray-100 p-4" style={{ maxHeight: "70vh" }}>
        <div className="flex justify-center">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex h-[400px] items-center justify-center">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                  style={{ borderColor: `${brandPrimary || "#00BCD4"} transparent ${brandPrimary || "#00BCD4"} ${brandPrimary || "#00BCD4"}` }}
                />
              </div>
            }
            error={
              <div className="flex h-[200px] items-center justify-center text-sm text-gray-500">
                Kan PDF niet laden. Probeer het opnieuw of download het bestand.
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              className="shadow-lg"
              loading={
                <div className="flex h-[400px] w-[280px] items-center justify-center bg-white">
                  <div
                    className="h-6 w-6 animate-spin rounded-full border-3 border-t-transparent"
                    style={{ borderColor: `${brandPrimary || "#00BCD4"} transparent ${brandPrimary || "#00BCD4"} ${brandPrimary || "#00BCD4"}` }}
                  />
                </div>
              }
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
