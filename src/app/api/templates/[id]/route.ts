import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Template from "@/models/Template";

export async function GET(
  _req: NextRequest,
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

    const template = await Template.findOne({
      templateId: id,
      $or: [
        { isSystem: true },
        { organizationId: session.user.organizationId },
      ],
    }).lean();

    if (!template) {
      return NextResponse.json(
        { error: "Sjabloon niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Template GET error:", error);
    return NextResponse.json(
      { error: "Kon sjabloon niet ophalen." },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const template = await Template.findOne({
      templateId: id,
      $or: [
        { isSystem: true },
        { organizationId: session.user.organizationId },
      ],
    });

    if (!template) {
      return NextResponse.json(
        { error: "Sjabloon niet gevonden of niet bewerkbaar." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const allowedFields = [
      "name",
      "primary",
      "primaryDark",
      "primaryLight",
      "headerStyle",
      "showB1Button",
      "showInfoBox",
      "infoBoxLabel",
    ];

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        (template as Record<string, unknown>)[key] = body[key];
      }
    }

    await template.save();

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Template PUT error:", error);
    return NextResponse.json(
      { error: "Kon sjabloon niet bijwerken." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
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

    const template = await Template.findOne({
      templateId: id,
      organizationId: session.user.organizationId,
      isSystem: false,
    });

    if (!template) {
      return NextResponse.json(
        { error: "Sjabloon niet gevonden of niet verwijderbaar." },
        { status: 404 }
      );
    }

    await template.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template DELETE error:", error);
    return NextResponse.json(
      { error: "Kon sjabloon niet verwijderen." },
      { status: 500 }
    );
  }
}
