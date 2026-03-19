import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Integration, { INTEGRATION_TYPES } from "@/models/Integration";

export async function POST(
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
      return NextResponse.json(
        { error: "Integratie niet geconfigureerd." },
        { status: 404 }
      );
    }

    const testPayload = {
      documentId: "test",
      title: "Test Document",
      status: "ready",
    };

    try {
      switch (type) {
        case "slack": {
          const { sendSlackNotification } = await import(
            "@/lib/integrations/slack"
          );
          await sendSlackNotification(
            integration.config.slackWebhookUrl!,
            "test",
            testPayload
          );
          break;
        }
        case "teams": {
          const { sendTeamsNotification } = await import(
            "@/lib/integrations/teams"
          );
          await sendTeamsNotification(
            integration.config.teamsWebhookUrl!,
            "test",
            testPayload
          );
          break;
        }
        case "notion": {
          // Just verify the API key works
          const { Client } = await import("@notionhq/client");
          const notion = new Client({
            auth: integration.config.notionApiKey,
          });
          await notion.pages.retrieve({
            page_id: integration.config.notionParentPageId!,
          });
          break;
        }
      }

      return NextResponse.json({
        data: { success: true, message: "Test geslaagd!" },
      });
    } catch (testError) {
      return NextResponse.json({
        data: {
          success: false,
          error:
            testError instanceof Error
              ? testError.message
              : "Verbinding mislukt",
        },
      });
    }
  } catch (error) {
    console.error("Integration test error:", error);
    return NextResponse.json(
      { error: "Kon test niet uitvoeren." },
      { status: 500 }
    );
  }
}
