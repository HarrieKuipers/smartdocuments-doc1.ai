import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Niet geautoriseerd.", { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let interval: ReturnType<typeof setInterval>;
      let timeout: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearTimeout(timeout);
        try {
          controller.close();
        } catch {
          // already closed by client disconnect
        }
      };

      const sendEvent = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          cleanup();
        }
      };

      let lastStep = "";
      let lastPercentage = 0;

      interval = setInterval(async () => {
        try {
          const doc = await DocumentModel.findOne({
            _id: id,
            organizationId: session.user.organizationId,
          })
            .select("status processingProgress")
            .lean();

          if (!doc) {
            sendEvent({ error: "Document niet gevonden." });
            cleanup();
            return;
          }

          const step = doc.processingProgress?.step || "";
          const percentage = doc.processingProgress?.percentage || 0;

          if (step !== lastStep || percentage !== lastPercentage) {
            lastStep = step;
            lastPercentage = percentage;
            sendEvent({
              status: doc.status,
              step,
              percentage,
            });
          }

          if (doc.status === "ready" || doc.status === "error") {
            sendEvent({
              status: doc.status,
              step,
              percentage: doc.status === "ready" ? 100 : percentage,
            });
            cleanup();
          }
        } catch (error) {
          console.error("Progress SSE error:", error);
          cleanup();
        }
      }, 1000);

      // Timeout after 5 minutes
      timeout = setTimeout(() => {
        cleanup();
      }, 5 * 60 * 1000);
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
