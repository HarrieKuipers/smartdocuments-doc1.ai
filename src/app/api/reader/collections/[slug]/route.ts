import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import Template from "@/models/Template";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    const collection = await Collection.findOne({ slug }).lean();
    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    // Check password protection
    if (collection.access?.type === "password") {
      const password = req.headers.get("x-collection-password");
      if (!password) {
        // Return collection metadata without documents
        const org = await Organization.findById(collection.organizationId)
          .select("name slug logo brandColors")
          .lean();
        return NextResponse.json(
          {
            error: "password-required",
            requiresPassword: true,
            data: {
              name: collection.name,
              description: collection.description,
              organization: org,
            },
          },
          { status: 401 }
        );
      }
      const isValid = await bcrypt.compare(
        password,
        collection.access.password || ""
      );
      if (!isValid) {
        return NextResponse.json(
          { error: "Onjuist wachtwoord.", requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // Get organization info
    const org = await Organization.findById(collection.organizationId)
      .select("name slug logo brandColors")
      .lean();

    if (!org) {
      return NextResponse.json(
        { error: "Organisatie niet gevonden." },
        { status: 404 }
      );
    }

    // Get published documents in this collection
    const docs = await DocumentModel.find({
      collectionId: collection._id,
      status: "ready",
    })
      .select(
        "title shortId slug authors description coverImageUrl customCoverUrl publicationDate tags pageCount createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Fetch full template config if a template is set
    let templateConfig = null;
    if (collection.template) {
      const tpl = await Template.findOne({ templateId: collection.template })
        .select("templateId name primary primaryDark primaryLight logo headerStyle logoPosition")
        .lean();
      if (tpl) {
        templateConfig = {
          id: tpl.templateId,
          name: tpl.name,
          primary: tpl.primary,
          primaryDark: tpl.primaryDark,
          primaryLight: tpl.primaryLight,
          logo: tpl.logo,
          headerStyle: tpl.headerStyle,
          logoPosition: tpl.logoPosition,
        };
      }
    }

    return NextResponse.json({
      data: {
        _id: collection._id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        coverImage: collection.coverImage,
        template: collection.template,
        templateConfig,
        chatIntro: collection.chatIntro,
        chatPlaceholder: collection.chatPlaceholder,
        chatSuggestions: collection.chatSuggestions,
        organization: org,
        documents: docs,
      },
    });
  } catch (error) {
    console.error("Public collection GET error:", error);
    return NextResponse.json(
      { error: "Kon collectie niet ophalen." },
      { status: 500 }
    );
  }
}
