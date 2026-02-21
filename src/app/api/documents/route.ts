import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import User from "@/models/User";
import { generateShortId } from "@/lib/nanoid";
import { generateSlug } from "@/lib/slug";
import { getFileUrl } from "@/lib/storage";
import { canCreateDocument } from "@/lib/plan-limits";
import { PlanType } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = {
      organizationId: session.user.organizationId,
    };
    if (status) filter.status = status;
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const [docs, total] = await Promise.all([
      DocumentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DocumentModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: docs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Documents GET error:", error);
    return NextResponse.json(
      { error: "Kon documenten niet ophalen." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    await connectDB();

    // Check plan limits
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
    }

    if (!canCreateDocument(user.plan as PlanType, user.documentsUsed)) {
      return NextResponse.json(
        { error: "Je hebt het maximaal aantal documenten voor je abonnement bereikt." },
        { status: 403 }
      );
    }

    const { filename, mimeType, sizeBytes, storageKey } = await req.json();

    const title = filename.replace(/\.[^.]+$/, "");
    const shortId = generateShortId();
    const slug = generateSlug(title);

    const doc = await DocumentModel.create({
      shortId,
      slug,
      organizationId: session.user.organizationId,
      uploadedBy: session.user.id,
      title,
      sourceFile: {
        url: getFileUrl(storageKey),
        filename,
        mimeType,
        sizeBytes,
        uploadedAt: new Date(),
      },
      status: "uploading",
    });

    // Increment user document count
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { documentsUsed: 1 },
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    console.error("Documents POST error:", error);
    return NextResponse.json(
      { error: "Kon document niet aanmaken." },
      { status: 500 }
    );
  }
}
