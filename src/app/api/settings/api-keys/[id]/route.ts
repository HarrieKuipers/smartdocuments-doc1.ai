import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import ApiKey from "@/models/ApiKey";
import { canUseApi } from "@/lib/plan-limits";
import type { PlanType } from "@/lib/stripe";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    if (!canUseApi(session.user.plan as PlanType)) {
      return NextResponse.json(
        { error: "API is alleen beschikbaar voor Enterprise klanten." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const updates = await req.json();

    await connectDB();

    const allowedUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.scopes !== undefined) allowedUpdates.scopes = updates.scopes;
    if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;

    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: id, organizationId: session.user.organizationId },
      allowedUpdates,
      { new: true }
    )
      .select("name keyPrefix scopes isActive lastUsedAt expiresAt createdAt")
      .lean();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API sleutel niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: apiKey });
  } catch (error) {
    console.error("API key update error:", error);
    return NextResponse.json(
      { error: "Kon API sleutel niet bijwerken." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const result = await ApiKey.findOneAndDelete({
      _id: id,
      organizationId: session.user.organizationId,
    });

    if (!result) {
      return NextResponse.json(
        { error: "API sleutel niet gevonden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "API sleutel verwijderd." });
  } catch (error) {
    console.error("API key delete error:", error);
    return NextResponse.json(
      { error: "Kon API sleutel niet verwijderen." },
      { status: 500 }
    );
  }
}
