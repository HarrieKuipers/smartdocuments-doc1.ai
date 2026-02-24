import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Template from "@/models/Template";
import { TEMPLATES, TEMPLATE_IDS } from "@/lib/templates";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();

    // Seed system templates if they don't exist yet
    for (const id of TEMPLATE_IDS) {
      const exists = await Template.findOne({ templateId: id });
      if (!exists) {
        await Template.create({
          templateId: id,
          ...TEMPLATES[id],
          isSystem: true,
        });
      }
    }

    // Return system templates + org-specific templates
    const templates = await Template.find({
      $or: [
        { isSystem: true },
        { organizationId: session.user.organizationId },
      ],
    })
      .sort({ isSystem: -1, name: 1 })
      .lean();

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json(
      { error: "Kon sjablonen niet ophalen." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Niet geautoriseerd." },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { name, primary, primaryDark, primaryLight, headerStyle, showB1Button, showInfoBox, infoBoxLabel } = body;

    if (!name || !primary || !primaryDark || !primaryLight) {
      return NextResponse.json(
        { error: "Naam en kleuren zijn verplicht." },
        { status: 400 }
      );
    }

    const templateId = `custom-${nanoid(10)}`;

    const template = await Template.create({
      templateId,
      name,
      primary,
      primaryDark,
      primaryLight,
      headerStyle: headerStyle || "default",
      showB1Button: showB1Button || false,
      showInfoBox: showInfoBox || false,
      infoBoxLabel: infoBoxLabel || "",
      isSystem: false,
      organizationId: session.user.organizationId,
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("Templates POST error:", error);
    return NextResponse.json(
      { error: "Kon sjabloon niet aanmaken." },
      { status: 500 }
    );
  }
}
