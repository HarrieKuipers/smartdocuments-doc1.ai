import type { ApiKeyScope } from "@/models/ApiKey";

export interface ApiKeyContext {
  organizationId: string;
  apiKeyId: string;
  scopes: ApiKeyScope[];
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}
