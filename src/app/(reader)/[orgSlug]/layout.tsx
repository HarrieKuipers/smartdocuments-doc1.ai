import { Metadata } from "next";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import CookieBanner from "@/components/analytics/CookieBanner";
import SessionProvider from "@/components/common/SessionProvider";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orgSlug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug: slug } = await params;
  await connectDB();

  const doc = await DocumentModel.findOne({
    $or: [{ shortId: slug }, { customSlug: slug }],
    status: "ready",
  })
    .select("title description tags coverImageUrl customCoverUrl organizationId")
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
  const coverImage = (doc as { customCoverUrl?: string }).customCoverUrl || doc.coverImageUrl;

  return {
    title,
    description,
    openGraph: {
      title: doc.title,
      description,
      type: "article",
      images: coverImage
        ? [
            {
              url: coverImage,
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
      images: coverImage ? [coverImage] : [],
    },
  };
}

export default function ReaderLayout({ children }: Props) {
  return (
    <SessionProvider>
      {children}
      <CookieBanner />
    </SessionProvider>
  );
}
