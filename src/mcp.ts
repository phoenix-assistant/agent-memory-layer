/**
 * MCP (Model Context Protocol) server adapter for agent-memory-layer.
 * Exposes remember/recall/forget as MCP tools.
 *
 * Usage: node dist/mcp.js [--store path] [--backend file|sqlite]
 */

import { MemoryStore } from "./memory.js";
import { FileBackend } from "./backends/file.js";
import path from "node:path";
import os from "node:os";
import { createInterface } from "node:readline";

const storePath = process.argv.includes("--store")
  ? process.argv[process.argv.indexOf("--store") + 1]
  : path.join(os.homedir(), ".agent-memory", "memories.json");

const backend = new FileBackend(storePath);
const memory = new MemoryStore({ backend });

const TOOLS = [
  {
    name: "remember",
    description: "Store a key-value memory with semantic embedding",
    inputSchema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Memory key" },
        value: { type: "string", description: "Memory value" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "recall",
    description: "Semantic search across memories",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        topK: { type: "number", description: "Max results (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "forget",
    description: "Delete a memory by key",
    inputSchema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Memory key to delete" },
      },
      required: ["key"],
    },
  },
];

// Simple JSON-RPC over stdio
const rl = createInterface({ input: process.stdin });

function respond(id: unknown, result: unknown) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, result });
  process.stdout.write(msg + "\n");
}

function respondError(id: unknown, code: number, message: string) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
  process.stdout.write(msg + "\n");
}

rl.on("line", async (line) => {
  let req: any;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }

  const { id, method, params } = req;

  switch (method) {
    case "initialize":
      respond(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "agent-memory-layer", version: "0.1.0" },
      });
      break;

    case "tools/list":
      respond(id, { tools: TOOLS });
      break;

    case "tools/call": {
      const toolName = params?.name;
      const args = params?.arguments ?? {};

      try {
        if (toolName === "remember") {
          await memory.remember(args.key, args.value);
          respond(id, { content: [{ type: "text", text: `Remembered "${args.key}"` }] });
        } else if (toolName === "recall") {
          const results = await memory.recall(args.query, args.topK ?? 5);
          const text = results.map(r => `[${r.score.toFixed(3)}] ${r.key}: ${r.value}`).join("\n");
          respond(id, { content: [{ type: "text", text: text || "No memories found." }] });
        } else if (toolName === "forget") {
          const ok = await memory.forget(args.key);
          respond(id, { content: [{ type: "text", text: ok ? `Forgot "${args.key}"` : `Key not found` }] });
        } else {
          respondError(id, -32601, `Unknown tool: ${toolName}`);
        }
      } catch (err: any) {
        respondError(id, -32000, err.message);
      }
      break;
    }

    case "notifications/initialized":
      // No response needed for notifications
      break;

    default:
      if (id !== undefined) {
        respondError(id, -32601, `Method not found: ${method}`);
      }
  }
});
