import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentEvent, { EVENT_TYPES, EventType } from "@/models/DocumentEvent";
import { updateActiveSession } from "@/app/api/analytics/documents/[documentId]/live/route";

const MAX_EVENTS_PER_REQUEST = 100;

interface IncomingEvent {
  documentId: string;
  sessionId: string;
  eventType: EventType;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { events } = body as { events: IncomingEvent[] };

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Events array is required" },
        { status: 400 }
      );
    }

    if (events.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_EVENTS_PER_REQUEST} events per request` },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = events.filter(
      (e) =>
        e.documentId &&
        e.sessionId &&
        e.eventType &&
        EVENT_TYPES.includes(e.eventType)
    );

    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: "No valid events provided" },
        { status: 400 }
      );
    }

    // Enrich with geo/IP data from headers
    const forwarded = req.headers.get("x-forwarded-for");
    const country = req.headers.get("x-vercel-ip-country") || undefined;
    const city = req.headers.get("x-vercel-ip-city") || undefined;
    // Do not store full IP — only country/city for GDPR compliance
    void forwarded;

    await connectDB();

    const docs = validEvents.map((e) => ({
      documentId: e.documentId,
      sessionId: e.sessionId,
      eventType: e.eventType,
      metadata: {
        ...((e.metadata as Record<string, unknown>) || {}),
        country: (e.metadata as Record<string, unknown>)?.country || country,
        city: (e.metadata as Record<string, unknown>)?.city || city,
      },
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));

    await DocumentEvent.insertMany(docs, { ordered: false });

    // Update live session tracker for real-time dashboard
    for (const e of docs) {
      const meta = e.metadata as Record<string, unknown> | undefined;
      updateActiveSession(e.documentId as string, e.sessionId, {
        device: (meta?.device as string) || undefined,
        city: (meta?.city as string) || undefined,
        sectionTitle: (meta?.sectionTitle as string) || undefined,
      });
    }

    return NextResponse.json({ received: docs.length });
  } catch (error) {
    console.error("Analytics event ingest error:", error);
    return NextResponse.json(
      { error: "Failed to process events" },
      { status: 500 }
    );
  }
}
