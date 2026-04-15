# agent-memory-layer

Persistent memory layer for AI agents. Simple API: `remember`, `recall`, `forget` — with semantic search via cosine similarity.

## Install

```bash
npm install @phoenixaihub/agent-memory-layer
```

## Usage

```typescript
import { MemoryStore, FileBackend } from "@phoenixaihub/agent-memory-layer";

const store = new MemoryStore({
  backend: new FileBackend("./memories.json"),
});

await store.remember("user-pref", "prefers dark mode");
await store.remember("project", "building an AI assistant");

const results = await store.recall("what theme does the user like?");
// [{ key: "user-pref", value: "prefers dark mode", score: 0.87 }]

await store.forget("user-pref");
```

## Backends

- **FileBackend** — JSON file storage, zero dependencies
- **SqliteBackend** — SQLite via better-sqlite3, WAL mode

## CLI

```bash
agent-memory remember greeting "hello world"
agent-memory recall "greetings"
agent-memory forget greeting
agent-memory list
agent-memory clear
```

## MCP Server

```bash
node dist/mcp.js --store ./memories.json
```

Exposes `remember`, `recall`, `forget` as MCP tools over JSON-RPC stdio.

## License

MIT
