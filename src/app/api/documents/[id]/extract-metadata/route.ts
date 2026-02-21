import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { extractText } from "@/lib/ai/extract-text";
import { extractMetadata } from "@/lib/ai/extract-metadata";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!doc) {
      return NextResponse.json({ error: "Document niet gevonden." }, { status: 404 });
    }

    // Extract text if not already done
    let text = doc.content?.originalText;
    if (!text) {
      const fileResponse = await fetch(doc.sourceFile.url);
      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      const extracted = await extractText(buffer, doc.sourceFile.mimeType);
      text = extracted.text;
      doc.content.originalText = text;
      if (extracted.pageCount) doc.pageCount = extracted.pageCount;
      await doc.save();
    }

    // Extract metadata with AI
    const metadata = await extractMetadata(text);

    return NextResponse.json({ data: metadata });
  } catch (error) {
    console.error("Extract metadata error:", error);
    return NextResponse.json(
      { error: "Metadata extractie mislukt." },
      { status: 500 }
    );
  }
}
