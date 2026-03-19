import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";

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
    const collection = await Collection.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    })
      .select("slug embedConfig")
      .lean();

    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://doc1.ai";
    const config = (collection.embedConfig || {}) as {
      defaultMode?: string;
      defaultTheme?: string;
      whitelabel?: boolean;
      colorOverride?: string;
    };
    const mode = config.defaultMode || "full";
    const theme = config.defaultTheme || "light";
    const whitelabel = config.whitelabel || false;
    const colorOverride = config.colorOverride;

    const embedParams = new URLSearchParams();
    embedParams.set("mode", mode);
    if (theme === "dark") embedParams.set("theme", "dark");
    if (whitelabel) embedParams.set("whitelabel", "true");
    if (colorOverride) embedParams.set("color", colorOverride);

    const embedUrl = `${siteUrl}/embed/c/${collection.slug}?${embedParams.toString()}`;

    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" style="border: 1px solid #e5e7eb; border-radius: 8px;" frameborder="0" allowfullscreen></iframe>`;

    const scriptCode = `<div id="doc1-collection-${collection.slug}"></div>
<script>
(function() {
  var c = document.getElementById('doc1-collection-${collection.slug}');
  var f = document.createElement('iframe');
  f.src = '${embedUrl}';
  f.style.width = '100%';
  f.style.height = '600px';
  f.style.border = '1px solid #e5e7eb';
  f.style.borderRadius = '8px';
  f.frameBorder = '0';
  f.allowFullscreen = true;
  c.appendChild(f);
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
    console.error("Collection embed GET error:", error);
    return NextResponse.json(
      { error: "Kon embed code niet genereren." },
      { status: 500 }
    );
  }
}
