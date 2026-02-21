import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return _anthropic;
}

export const MODELS = {
  processing: "claude-sonnet-4-20250514",
  chat: "claude-haiku-4-5-20251001",
} as const;

export default new Proxy({} as Anthropic, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getAnthropicClient() as any)[prop];
  },
});
