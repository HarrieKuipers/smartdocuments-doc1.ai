import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Integration from "@/models/Integration";
import { canUseIntegrations } from "@/lib/plan-limits";
import type { PlanType } from "@/lib/stripe";

export async function GET() {
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

    await connectDB();

    const integrations = await Integration.find({
      organizationId: session.user.organizationId,
    }).lean();

    // Mask sensitive fields
    const masked = integrations.map((i) => ({
      ...i,
      config: {
        ...i.config,
        notionApiKey: i.config.notionApiKey
          ? `${i.config.notionApiKey.slice(0, 8)}...`
          : undefined,
      },
    }));

    return NextResponse.json({ data: masked });
  } catch (error) {
    console.error("Integrations list error:", error);
    return NextResponse.json(
      { error: "Kon integraties niet ophalen." },
      { status: 500 }
    );
  }
}
