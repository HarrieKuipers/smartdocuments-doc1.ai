import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import ApiKey, { type ApiKeyScope } from "@/models/ApiKey";
import type { ApiKeyContext } from "@/types/api-v1";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function authenticateApiKey(
  req: NextRequest
): Promise<ApiKeyContext> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw NextResponse.json(
      { error: "API sleutel ontbreekt. Gebruik Authorization: Bearer <key>." },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("dk_live_")) {
    throw NextResponse.json(
      { error: "Ongeldig API sleutel formaat." },
      { status: 401 }
    );
  }

  await connectDB();

  const keyHash = hashApiKey(rawKey);
  const apiKey = await ApiKey.findOne({ keyHash }).lean();

  if (!apiKey) {
    throw NextResponse.json(
      { error: "Ongeldige API sleutel." },
      { status: 401 }
    );
  }

  if (!apiKey.isActive) {
    throw NextResponse.json(
      { error: "API sleutel is gedeactiveerd." },
      { status: 401 }
    );
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw NextResponse.json(
      { error: "API sleutel is verlopen." },
      { status: 401 }
    );
  }

  // Update lastUsedAt (fire-and-forget)
  ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() }).catch(
    () => {}
  );

  return {
    organizationId: apiKey.organizationId.toString(),
    apiKeyId: apiKey._id.toString(),
    scopes: apiKey.scopes,
  };
}

export function requireScope(ctx: ApiKeyContext, scope: ApiKeyScope): void {
  if (!ctx.scopes.includes(scope)) {
    throw NextResponse.json(
      {
        error: `Onvoldoende rechten. Scope '${scope}' is vereist.`,
      },
      { status: 403 }
    );
  }
}
