/**
 * MCP client for the Redactietool B1 analysis server.
 * Adapted from leene-redactieflow for doc1.ai rewrite pipeline.
 *
 * Uses direct HTTP (JSON-RPC over MCP Streamable HTTP transport).
 * Server-side only.
 */

const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
const MCP_API_KEY = process.env.REDACTIETOOL_API_KEY;

function mcpHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (MCP_API_KEY) {
    headers["Authorization"] = `Bearer ${MCP_API_KEY}`;
  }
  if (extra) {
    Object.assign(headers, extra);
  }
  return headers;
}

async function createSession(): Promise<string | null> {
  if (!MCP_SERVER_URL) return null;

  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: "POST",
    headers: mcpHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "doc1-rewrite", version: "1.0.0" },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `MCP initialize failed: ${response.status} - ${text.substring(0, 200)}`
    );
  }

  const sid = response.headers.get("Mcp-Session-Id");

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    await response.text();
  } else {
    await response.json();
  }

  if (sid) {
    await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: "POST",
      headers: mcpHeaders({ "Mcp-Session-Id": sid }),
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    }).catch(() => {});
  }

  return sid;
}

async function callToolWithSession(
  sessionId: string | null,
  name: string,
  args: Record<string, unknown>,
  callId: number
): Promise<unknown> {
  if (!MCP_SERVER_URL) {
    throw new Error("MCP_SERVER_URL is not configured");
  }

  const headers = mcpHeaders(
    sessionId ? { "Mcp-Session-Id": sessionId } : undefined
  );

  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: callId,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `MCP tool call failed: ${response.status} - ${text.substring(0, 200)}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let result: {
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };

  if (contentType.includes("text/event-stream")) {
    const text = await response.text();
    const lines = text.split("\n");
    let found = false;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith("data: ")) {
        const data = JSON.parse(lines[i].slice(6));
        if (data.id === callId) {
          if (data.error) {
            throw new Error(`MCP error: ${data.error.message}`);
          }
          result = data.result;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      throw new Error(`No matching response in SSE for call ${callId}`);
    }
  } else {
    const data = await response.json();
    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }
    result = data.result;
  }

  if (result!.isError) {
    throw new Error(`MCP tool error: ${JSON.stringify(result!.content)}`);
  }

  const textBlock = result!.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("MCP tool returned no text content");
  }

  return JSON.parse(textBlock.text);
}

/**
 * Call multiple MCP tools in parallel within a single session.
 */
export async function callMCPToolsBatch(
  tools: Array<{ name: string; args: Record<string, unknown> }>
): Promise<Map<string, unknown>> {
  if (!MCP_SERVER_URL) {
    console.warn("MCP_SERVER_URL not configured, skipping MCP tools");
    return new Map();
  }

  console.log(
    `MCP batch: starting ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`
  );
  const batchStart = Date.now();

  const sid = await createSession();
  const results = new Map<string, unknown>();

  const promises = tools.map((tool, idx) =>
    callToolWithSession(sid, tool.name, tool.args, idx + 2)
      .then((result) => ({ name: tool.name, result, error: null as Error | null }))
      .catch((error) => ({
        name: tool.name,
        result: null,
        error: error as Error,
      }))
  );

  const settled = await Promise.all(promises);

  for (const { name, result, error } of settled) {
    if (error) {
      console.warn(`MCP tool ${name} failed (non-blocking):`, error.message);
    } else {
      results.set(name, result);
    }
  }

  const elapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
  console.log(
    `MCP batch complete in ${elapsed}s: ${results.size}/${tools.length} succeeded`
  );

  return results;
}

/**
 * Run MCP tools for specific schrijfwijzer rules on a text chunk.
 */
export async function runMCPToolsForRules(
  tekst: string,
  ruleToolMap: Record<number, string[]>,
  selectedRules: number[]
): Promise<Map<string, unknown>> {
  const toolsToRun: Array<{ name: string; args: Record<string, unknown> }> = [];
  const seenTools = new Set<string>();

  for (const ruleNumber of selectedRules) {
    const tools = ruleToolMap[ruleNumber] || [];
    for (const toolName of tools) {
      if (!seenTools.has(toolName)) {
        seenTools.add(toolName);
        toolsToRun.push({
          name: toolName,
          args: buildToolArgs(toolName, tekst),
        });
      }
    }
  }

  if (toolsToRun.length === 0) {
    return new Map();
  }

  return callMCPToolsBatch(toolsToRun);
}

function buildToolArgs(
  toolName: string,
  tekst: string
): Record<string, unknown> {
  switch (toolName) {
    case "check_zinslengte":
      return { tekst, max_woorden: 15 };
    case "check_tangconstructies":
      return { tekst, max_afstand: 5 };
    case "check_jargon":
      return { tekst, domein: "overheid" };
    default:
      return { tekst };
  }
}
