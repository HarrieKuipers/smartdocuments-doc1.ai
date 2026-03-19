import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Integration, { INTEGRATION_TYPES } from "@/models/Integration";
import { canUseIntegrations } from "@/lib/plan-limits";
import type { PlanType } from "@/lib/stripe";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    const { type } = await params;

    if (!INTEGRATION_TYPES.includes(type as (typeof INTEGRATION_TYPES)[number])) {
      return NextResponse.json(
        { error: "Ongeldig integratie type." },
        { status: 400 }
      );
    }

    await connectDB();

    const integration = await Integration.findOne({
      organizationId: session.user.organizationId,
      type,
    }).lean();

    if (!integration) {
      return NextResponse.json({ data: null });
    }

    // Mask Notion API key
    const masked = {
      ...integration,
      config: {
        ...integration.config,
        notionApiKey: integration.config.notionApiKey
          ? `${integration.config.notionApiKey.slice(0, 8)}...`
          : undefined,
      },
    };

    return NextResponse.json({ data: masked });
  } catch (error) {
    console.error("Integration get error:", error);
    return NextResponse.json(
      { error: "Kon integratie niet ophalen." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    if (!canUseIntegrations(session.user.plan as PlanType)) {
      return NextResponse.json(
        { error: "Integraties zijn alleen beschikbaar voor Enterprise klanten." },
        { status: 403 }
      );
    }

    const { type } = await params;

    if (!INTEGRATION_TYPES.includes(type as (typeof INTEGRATION_TYPES)[number])) {
      return NextResponse.json(
        { error: "Ongeldig integratie type." },
        { status: 400 }
      );
    }

    const { config, events, isActive } = await req.json();

    await connectDB();

    const integration = await Integration.findOneAndUpdate(
      {
        organizationId: session.user.organizationId,
        type,
      },
      {
        config,
        events: events || [],
        isActive: isActive !== undefined ? isActive : true,
        createdBy: session.user.id,
      },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ data: integration });
  } catch (error) {
    console.error("Integration update error:", error);
    return NextResponse.json(
      { error: "Kon integratie niet bijwerken." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    const { type } = await params;

    await connectDB();

    const result = await Integration.findOneAndDelete({
      organizationId: session.user.organizationId,
      type,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Integratie niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Integratie verwijderd." });
  } catch (error) {
    console.error("Integration delete error:", error);
    return NextResponse.json(
      { error: "Kon integratie niet verwijderen." },
      { status: 500 }
    );
  }
}
