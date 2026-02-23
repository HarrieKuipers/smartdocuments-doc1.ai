import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import DocumentModel from "@/models/Document";

// Add documents to a collection
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
    const { documentIds } = await req.json();

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "Geen documenten geselecteerd." },
        { status: 400 }
      );
    }

    // Verify collection belongs to user's organization
    const collection = await Collection.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });
    if (!collection) {
      return NextResponse.json({ error: "Collectie niet gevonden." }, { status: 404 });
    }

    // Update documents to belong to this collection
    const result = await DocumentModel.updateMany(
      {
        _id: { $in: documentIds },
        organizationId: session.user.organizationId,
      },
      { $set: { collectionId: id } }
    );

    // Update document count
    const count = await DocumentModel.countDocuments({ collectionId: id });
    await Collection.findByIdAndUpdate(id, { documentCount: count });

    return NextResponse.json({
      message: `${result.modifiedCount} document(en) toegevoegd.`,
    });
  } catch (error) {
    console.error("Collection add documents error:", error);
    return NextResponse.json(
      { error: "Kon documenten niet toevoegen." },
      { status: 500 }
    );
  }
}

// Remove a document from a collection
export async function DELETE(
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
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is verplicht." },
        { status: 400 }
      );
    }

    // Verify collection belongs to user's organization
    const collection = await Collection.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    });
    if (!collection) {
      return NextResponse.json({ error: "Collectie niet gevonden." }, { status: 404 });
    }

    // Remove collectionId from the document
    await DocumentModel.findOneAndUpdate(
      {
        _id: documentId,
        organizationId: session.user.organizationId,
        collectionId: id,
      },
      { $unset: { collectionId: "" } }
    );

    // Update document count
    const count = await DocumentModel.countDocuments({ collectionId: id });
    await Collection.findByIdAndUpdate(id, { documentCount: count });

    return NextResponse.json({ message: "Document verwijderd uit collectie." });
  } catch (error) {
    console.error("Collection remove document error:", error);
    return NextResponse.json(
      { error: "Kon document niet verwijderen uit collectie." },
      { status: 500 }
    );
  }
}
