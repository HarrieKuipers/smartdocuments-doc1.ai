import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import Webhook from "@/models/Webhook";
import WebhookDelivery from "@/models/WebhookDelivery";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await connectDB();

    const result = await Webhook.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: "Webhook niet gevonden." }, { status: 404 });
    }

    await WebhookDelivery.deleteMany({ webhookId: id });

    return NextResponse.json({ message: "Webhook verwijderd." });
  } catch (error) {
    console.error("Admin webhook delete error:", error);
    return NextResponse.json({ error: "Kon webhook niet verwijderen." }, { status: 500 });
  }
}
