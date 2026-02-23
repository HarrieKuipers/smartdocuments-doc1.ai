import { Metadata } from "next";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import CookieBanner from "@/components/analytics/CookieBanner";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ shortId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shortId } = await params;
  await connectDB();

  const doc = await DocumentModel.findOne({ shortId, status: "ready" })
    .select("title description tags coverImageUrl organizationId")
    .lean();

  if (!doc) {
    return { title: "Document niet gevonden" };
  }

  const org = await Organization.findById(doc.organizationId)
    .select("name")
    .lean();

  const orgName = (org as { name?: string })?.name || "doc1.ai";
  const title = `${doc.title} | ${orgName}`;
  const description =
    doc.description || doc.tags?.join(", ") || "Document op doc1.ai";

  return {
    title,
    description,
    openGraph: {
      title: doc.title,
      description,
      type: "article",
      images: doc.coverImageUrl
        ? [
            {
              url: doc.coverImageUrl,
              width: 1200,
              height: 630,
              alt: doc.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: doc.title,
      description,
      images: doc.coverImageUrl ? [doc.coverImageUrl] : [],
    },
  };
}

export default function ReaderLayout({ children }: Props) {
  return (
    <>
      {children}
      <CookieBanner />
    </>
  );
}
