import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Webhook from "@/models/Webhook";
import WebhookDelivery from "@/models/WebhookDelivery";
import { canUseWebhooks } from "@/lib/plan-limits";
import type { PlanType } from "@/lib/stripe";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const webhook = await Webhook.findOne({
      _id: id,
      organizationId: session.user.organizationId,
    }).lean();

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook niet gevonden." },
        { status: 404 }
      );
    }

    const recentDeliveries = await WebhookDelivery.find({ webhookId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      data: { ...webhook, recentDeliveries },
    });
  } catch (error) {
    console.error("Webhook get error:", error);
    return NextResponse.json(
      { error: "Kon webhook niet ophalen." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    if (!canUseWebhooks(session.user.plan as PlanType)) {
      return NextResponse.json(
        { error: "Webhooks zijn alleen beschikbaar voor Enterprise klanten." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const updates = await req.json();

    await connectDB();

    const allowedUpdates: Record<string, unknown> = {};
    if (updates.url !== undefined) allowedUpdates.url = updates.url;
    if (updates.events !== undefined) allowedUpdates.events = updates.events;
    if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;

    const webhook = await Webhook.findOneAndUpdate(
      { _id: id, organizationId: session.user.organizationId },
      allowedUpdates,
      { new: true }
    ).lean();

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: webhook });
  } catch (error) {
    console.error("Webhook update error:", error);
    return NextResponse.json(
      { error: "Kon webhook niet bijwerken." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const result = await Webhook.findOneAndDelete({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Webhook niet gevonden." },
        { status: 404 }
      );
    }

    // Clean up deliveries
    await WebhookDelivery.deleteMany({ webhookId: id });

    return NextResponse.json({ message: "Webhook verwijderd." });
  } catch (error) {
    console.error("Webhook delete error:", error);
    return NextResponse.json(
      { error: "Kon webhook niet verwijderen." },
      { status: 500 }
    );
  }
}
