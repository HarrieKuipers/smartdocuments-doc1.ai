import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Collection from "@/models/Collection";
import CollectionEvent, { COLLECTION_EVENT_TYPES } from "@/models/CollectionEvent";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const { events } = await req.json();

    if (!Array.isArray(events) || events.length === 0 || events.length > 50) {
      return NextResponse.json(
        { error: "Geef 1-50 events mee." },
        { status: 400 }
      );
    }

    const collection = await Collection.findOne({ slug })
      .select("_id")
      .lean();

    if (!collection) {
      return NextResponse.json(
        { error: "Collectie niet gevonden." },
        { status: 404 }
      );
    }

    // Detect device from user-agent
    const ua = req.headers.get("user-agent") || "";
    const device = /mobile/i.test(ua)
      ? "mobile"
      : /tablet|ipad/i.test(ua)
        ? "tablet"
        : "desktop";

    // Geo from headers (GDPR-compliant, no IP stored)
    const country = req.headers.get("x-vercel-ip-country") || undefined;
    const city = req.headers.get("x-vercel-ip-city") || undefined;
    const referrer = req.headers.get("referer") || undefined;

    const docs = events
      .filter(
        (e: { eventType: string; sessionId: string }) =>
          e.sessionId &&
          COLLECTION_EVENT_TYPES.includes(e.eventType as any)
      )
      .map((e: { eventType: string; sessionId: string; metadata?: Record<string, unknown>; timestamp?: string }) => ({
        collectionId: collection._id,
        sessionId: e.sessionId,
        eventType: e.eventType,
        metadata: {
          ...e.metadata,
          device,
          referrer,
          country,
          city,
        },
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      }));

    if (docs.length > 0) {
      await CollectionEvent.insertMany(docs, { ordered: false });
    }

    return NextResponse.json({ data: { inserted: docs.length } });
  } catch (error) {
    console.error("Collection event tracking error:", error);
    return NextResponse.json(
      { error: "Kon events niet opslaan." },
      { status: 500 }
    );
  }
}
