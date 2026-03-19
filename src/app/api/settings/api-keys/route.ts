import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import ApiKey from "@/models/ApiKey";
import { canUseApi } from "@/lib/plan-limits";
import type { PlanType } from "@/lib/stripe";
import { hashApiKey } from "@/lib/api-auth";

export async function GET() {
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

    await connectDB();

    const keys = await ApiKey.find({
      organizationId: session.user.organizationId,
    })
      .select("name keyPrefix scopes isActive lastUsedAt expiresAt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: keys });
  } catch (error) {
    console.error("API keys list error:", error);
    return NextResponse.json(
      { error: "Kon API sleutels niet ophalen." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const { name, scopes, expiresAt } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Naam is verplicht." },
        { status: 400 }
      );
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: "Minimaal één scope is verplicht." },
        { status: 400 }
      );
    }

    await connectDB();

    // Generate the API key
    const rawKey = `dk_live_${nanoid(32)}`;
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 16);

    const apiKey = await ApiKey.create({
      organizationId: session.user.organizationId,
      name: name.trim(),
      keyHash,
      keyPrefix,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        data: {
          _id: apiKey._id,
          name: apiKey.name,
          key: rawKey, // Only returned once!
          keyPrefix,
          scopes: apiKey.scopes,
          createdAt: apiKey.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API key creation error:", error);
    return NextResponse.json(
      { error: "Kon API sleutel niet aanmaken." },
      { status: 500 }
    );
  }
}
