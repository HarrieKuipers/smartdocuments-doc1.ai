import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Webhook from "@/models/Webhook";
import WebhookDelivery from "@/models/WebhookDelivery";

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
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    await connectDB();

    // Verify webhook belongs to org
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

    const [deliveries, total] = await Promise.all([
      WebhookDelivery.find({ webhookId: id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WebhookDelivery.countDocuments({ webhookId: id }),
    ]);

    return NextResponse.json({
      data: deliveries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Webhook deliveries error:", error);
    return NextResponse.json(
      { error: "Kon deliveries niet ophalen." },
      { status: 500 }
    );
  }
}
