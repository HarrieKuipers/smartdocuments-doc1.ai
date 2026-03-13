import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;
    const doc = await DocumentModel.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    })
      .select("shortId status")
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden." },
        { status: 404 }
      );
    }

    if (doc.status !== "ready") {
      return NextResponse.json(
        { error: "Document is nog niet gepubliceerd." },
        { status: 403 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://doc1.ai";
    const embedUrl = `${siteUrl}/embed/${doc.shortId}`;

    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" style="border: 1px solid #e5e7eb; border-radius: 8px;" frameborder="0" allowfullscreen></iframe>`;

    const scriptCode = `<div id="doc1-embed-${doc.shortId}"></div>
<script>
(function() {
  var container = document.getElementById('doc1-embed-${doc.shortId}');
  var iframe = document.createElement('iframe');
  iframe.src = '${embedUrl}';
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = '1px solid #e5e7eb';
  iframe.style.borderRadius = '8px';
  iframe.frameBorder = '0';
  iframe.allowFullscreen = true;
  container.appendChild(iframe);
})();
</script>`;

    return NextResponse.json({
      data: {
        iframeCode,
        scriptCode,
        embedUrl,
      },
    });
  } catch (error) {
    console.error("Embed GET error:", error);
    return NextResponse.json(
      { error: "Kon embed code niet genereren." },
      { status: 500 }
    );
  }
}
