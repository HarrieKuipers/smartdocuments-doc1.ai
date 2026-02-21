import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "doc1.ai — Maak elk document slim, toegankelijk en interactief",
    template: "%s | doc1.ai",
  },
  description:
    "Transformeer PDF en DOCX bestanden in interactieve, AI-verrijkte webdocumenten met samenvattingen, taalniveaus en een ingebouwde AI-assistent.",
  keywords: [
    "document",
    "AI",
    "PDF",
    "samenvatting",
    "toegankelijkheid",
    "taalniveau",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
