import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentRewrite from "@/models/DocumentRewrite";
import Schrijfwijzer from "@/models/Schrijfwijzer";
import { runRewritePipeline } from "@/lib/rewrite/pipeline";

// SSE endpoint: starts the rewrite pipeline and streams progress
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Niet geautoriseerd.", { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const rewrite = await DocumentRewrite.findOne({
    _id: id,
    organizationId: session.user.organizationId,
  });

  if (!rewrite) {
    return new Response("Rewrite niet gevonden.", { status: 404 });
  }

  if (rewrite.status !== "draft" && rewrite.status !== "editing") {
    return new Response("Rewrite kan niet opnieuw verwerkt worden.", {
      status: 400,
    });
  }

  const doc = await DocumentModel.findById(rewrite.documentId);
  if (!doc || !doc.content?.originalText) {
    return new Response("Document niet gevonden of geen tekst beschikbaar.", {
      status: 404,
    });
  }

  const schrijfwijzer = await Schrijfwijzer.findById(rewrite.schrijfwijzerId);
  if (!schrijfwijzer) {
    return new Response("Schrijfwijzer niet gevonden.", { status: 404 });
  }

  // Start SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      // Heartbeat to prevent proxy timeout
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 5000);

      try {
        // Update status to processing
        rewrite.status = "processing";
        rewrite.statusHistory.push({
          from: "draft",
          to: "processing",
          changedAt: new Date(),
          changedBy: "system",
        });
        await rewrite.save();

        sendEvent({ step: "starting", percentage: 0, message: "Pipeline gestart..." });

        const result = await runRewritePipeline({
          text: doc.content.originalText,
          rules: schrijfwijzer.rules,
          selectedRules: rewrite.selectedRules,
          onProgress: async (step, percentage, message) => {
            sendEvent({ step, percentage, message });
          },
        });

        // Save the result as a new version
        const newVersionNumber =
          Math.max(0, ...rewrite.versions.map((v) => v.versionNumber)) + 1;

        rewrite.versions.push({
          ...result.version,
          versionNumber: newVersionNumber,
          createdAt: new Date(),
        });

        rewrite.activeVersionNumber = newVersionNumber;
        rewrite.status = "rewritten";
        rewrite.statusHistory.push({
          from: "processing",
          to: "rewritten",
          changedAt: new Date(),
          changedBy: "system",
        });
        await rewrite.save();

        sendEvent({
          step: "complete",
          percentage: 100,
          message: "Herschrijving voltooid!",
          b1Score: result.version.b1Score,
          versionNumber: newVersionNumber,
        });
      } catch (error) {
        console.error("Rewrite pipeline error:", error);

        rewrite.status = "draft"; // Reset to draft on error
        rewrite.statusHistory.push({
          from: "processing",
          to: "draft",
          changedAt: new Date(),
          changedBy: "system",
          note: `Pipeline fout: ${error instanceof Error ? error.message : "Onbekende fout"}`,
        });
        await rewrite.save();

        sendEvent({
          step: "error",
          percentage: 0,
          message: `Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`,
          error: true,
        });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
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
