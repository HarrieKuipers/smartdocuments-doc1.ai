import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import Template from "@/models/Template";
import { buildPageImageUrls } from "@/lib/page-images";

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
        "title shortId slug authors description coverImageUrl customCoverUrl publicationDate tags pageCount pageLabelOffset chatSuggestions chatSuggestionsCache content.keyPoints visualContent createdAt"
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

    // Enrich documents with derived pageImages and flattened keyPoints
    const enrichedDocs = docs.map((doc) => {
      const allPageImages = doc.pageCount
        ? buildPageImageUrls(doc._id.toString(), doc.pageCount, doc.pageLabelOffset || 0)
        : [];
      // Only include pages that have visual content (tables, charts, etc.)
      const pageImages = allPageImages
        .map((pi) => {
          const vc = doc.visualContent?.find((v) => v.pageNumber === pi.pageNumber);
          return vc ? { ...pi, contentType: vc.contentType, description: vc.description } : null;
        })
        .filter(Boolean);

      return {
        _id: doc._id,
        title: doc.title,
        shortId: doc.shortId,
        slug: doc.slug,
        authors: doc.authors,
        description: doc.description,
        coverImageUrl: doc.coverImageUrl,
        customCoverUrl: doc.customCoverUrl,
        publicationDate: doc.publicationDate,
        tags: doc.tags,
        pageCount: doc.pageCount,
        chatSuggestions: doc.chatSuggestions,
        chatSuggestionsCache: doc.chatSuggestionsCache,
        keyPoints: doc.content?.keyPoints,
        pageImages,
        createdAt: doc.createdAt,
      };
    });

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
        chatSuggestionsCache: collection.chatSuggestionsCache,
        organization: org,
        documents: enrichedDocs,
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
