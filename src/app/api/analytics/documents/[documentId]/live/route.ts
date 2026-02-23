import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";

// In-memory store for active sessions (per-process)
// In production, use Redis for multi-instance support
const activeSessions = new Map<
  string,
  Map<
    string,
    {
      sessionId: string;
      device: string;
      city?: string;
      currentSection?: string;
      startedAt: Date;
      lastSeen: Date;
    }
  >
>();

// Update active session from event ingestion
export function updateActiveSession(
  documentId: string,
  sessionId: string,
  data: {
    device?: string;
    city?: string;
    sectionTitle?: string;
  }
) {
  if (!activeSessions.has(documentId)) {
    activeSessions.set(documentId, new Map());
  }
  const docSessions = activeSessions.get(documentId)!;

  const existing = docSessions.get(sessionId);
  docSessions.set(sessionId, {
    sessionId,
    device: data.device || existing?.device || "desktop",
    city: data.city || existing?.city,
    currentSection: data.sectionTitle || existing?.currentSection,
    startedAt: existing?.startedAt || new Date(),
    lastSeen: new Date(),
  });

  // Clean up inactive sessions (no activity for 5 minutes)
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [sid, session] of docSessions) {
    if (session.lastSeen.getTime() < fiveMinAgo) {
      docSessions.delete(sid);
    }
  }
}

// GET — SSE stream for live viewers
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();
  const { documentId } = await params;

  const doc = await DocumentModel.findOne({
    _id: documentId,
    organizationId: session.user.organizationId,
  }).lean();

  if (!doc) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      function sendUpdate() {
        const docSessions = activeSessions.get(documentId);
        const viewers = docSessions
          ? Array.from(docSessions.values()).map((s) => ({
              device: s.device,
              city: s.city,
              currentSection: s.currentSection,
              duration: Math.round(
                (Date.now() - s.startedAt.getTime()) / 1000
              ),
            }))
          : [];

        const data = JSON.stringify({
          activeViewers: viewers.length,
          viewers,
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      // Send initial state
      sendUpdate();

      // Send updates every 10 seconds
      const interval = setInterval(sendUpdate, 10000);

      // Clean up on close
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
