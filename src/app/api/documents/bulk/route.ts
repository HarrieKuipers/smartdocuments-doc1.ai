import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import Collection from "@/models/Collection";
import User from "@/models/User";
import { generateShortId } from "@/lib/nanoid";
import { generateSlug } from "@/lib/slug";
import { getFileUrl } from "@/lib/storage";
import { getRemainingDocuments } from "@/lib/plan-limits";
import { PlanType } from "@/lib/stripe";

interface BulkDocumentInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

interface BulkSettings {
  collectionId?: string;
  newCollectionName?: string;
  language: "nl" | "en";
  targetCEFRLevel?: "B1" | "B2" | "C1";
  template?: string;
  access: { type: "public" | "link-only" | "password"; password?: string };
  autoProcess: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
    }

    const { documents, settings } = (await req.json()) as {
      documents: BulkDocumentInput[];
      settings: BulkSettings;
    };

    if (!documents?.length) {
      return NextResponse.json({ error: "Geen documenten opgegeven." }, { status: 400 });
    }

    // Check plan limits
    const remaining = getRemainingDocuments(user.plan as PlanType, user.documentsUsed);
    if (remaining !== Infinity && documents.length > remaining) {
      return NextResponse.json(
        {
          error: `Je kunt nog ${remaining} document${remaining === 1 ? "" : "en"} aanmaken met je huidige abonnement.`,
          remaining,
        },
        { status: 403 }
      );
    }

    // Create new collection if requested
    let collectionId = settings.collectionId || undefined;
    if (settings.newCollectionName) {
      const collection = await Collection.create({
        name: settings.newCollectionName,
        slug: generateSlug(settings.newCollectionName),
        organizationId: session.user.organizationId,
        documentCount: 0,
      });
      collectionId = collection._id.toString();
    }

    // Build document records
    const docRecords = documents.map((doc) => {
      const title = doc.filename.replace(/\.[^.]+$/, "");
      const shortId = generateShortId();
      const slug = `${generateSlug(title)}-${shortId}`;

      return {
        shortId,
        slug,
        organizationId: session.user.organizationId,
        uploadedBy: session.user.id,
        title,
        language: settings.language === "en" ? "en" : "nl",
        targetCEFRLevel: settings.targetCEFRLevel || undefined,
        template: settings.template || undefined,
        collectionId: collectionId || undefined,
        access: {
          type: settings.access?.type || "link-only",
          password: settings.access?.password || undefined,
        },
        sourceFile: {
          url: getFileUrl(doc.storageKey),
          filename: doc.filename,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          uploadedAt: new Date(),
        },
        status: "uploading" as const,
      };
    });

    const createdDocs = await DocumentModel.insertMany(docRecords);

    // Update user document count
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { documentsUsed: documents.length },
    });

    // Update collection document count
    if (collectionId) {
      await Collection.findByIdAndUpdate(collectionId, {
        $inc: { documentCount: documents.length },
      });
    }

    return NextResponse.json(
      {
        data: createdDocs,
        collectionId: collectionId || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Bulk documents POST error:", error);
    return NextResponse.json(
      { error: "Kon documenten niet aanmaken." },
      { status: 500 }
    );
  }
}
