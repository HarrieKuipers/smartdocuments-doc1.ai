import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Webhook, { WEBHOOK_EVENTS } from "@/models/Webhook";
import { canUseWebhooks } from "@/lib/plan-limits";
import type { PlanType } from "@/lib/stripe";

export async function GET() {
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

    await connectDB();

    const webhooks = await Webhook.find({
      organizationId: session.user.organizationId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: webhooks });
  } catch (error) {
    console.error("Webhooks list error:", error);
    return NextResponse.json(
      { error: "Kon webhooks niet ophalen." },
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

    if (!canUseWebhooks(session.user.plan as PlanType)) {
      return NextResponse.json(
        { error: "Webhooks zijn alleen beschikbaar voor Enterprise klanten." },
        { status: 403 }
      );
    }

    const { url, events, description } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is verplicht." },
        { status: 400 }
      );
    }

    if (!url.startsWith("https://")) {
      return NextResponse.json(
        { error: "Webhook URL moet HTTPS zijn." },
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Minimaal één event is verplicht." },
        { status: 400 }
      );
    }

    const invalidEvents = events.filter(
      (e: string) => !WEBHOOK_EVENTS.includes(e as (typeof WEBHOOK_EVENTS)[number])
    );
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Ongeldige events: ${invalidEvents.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();

    const secret = `whsec_${nanoid(32)}`;

    const webhook = await Webhook.create({
      organizationId: session.user.organizationId,
      url: url.trim(),
      secret,
      events,
      description: description?.trim() || "",
      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        data: {
          ...webhook.toObject(),
          secret, // Show secret once on creation
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Webhook creation error:", error);
    return NextResponse.json(
      { error: "Kon webhook niet aanmaken." },
      { status: 500 }
    );
  }
}
