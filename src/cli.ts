#!/usr/bin/env node
import { Command } from "commander";
import { MemoryStore } from "./memory.js";
import { FileBackend } from "./backends/file.js";
import path from "node:path";
import os from "node:os";

const defaultPath = path.join(os.homedir(), ".agent-memory", "memories.json");

function createStore(opts: { store?: string; session?: string }) {
  const backend = new FileBackend(opts.store ?? defaultPath);
  return new MemoryStore({ backend, session: opts.session });
}

const program = new Command()
  .name("agent-memory")
  .description("CLI for managing agent memories")
  .version("0.1.0")
  .option("-s, --store <path>", "Memory store path", defaultPath)
  .option("--session <name>", "Session scope");

program
  .command("remember <key> <value>")
  .description("Store a memory")
  .action(async (key: string, value: string) => {
    const store = createStore(program.opts());
    await store.remember(key, value);
    console.log(`✓ Remembered "${key}"`);
  });

program
  .command("recall <query>")
  .description("Search memories by semantic similarity")
  .option("-k, --top-k <n>", "Number of results", "5")
  .action(async (query: string, opts: { topK: string }) => {
    const store = createStore(program.opts());
    const results = await store.recall(query, parseInt(opts.topK));
    if (results.length === 0) {
      console.log("No memories found.");
      return;
    }
    for (const r of results) {
      console.log(`[${r.score.toFixed(3)}] ${r.key}: ${r.value}`);
    }
  });

program
  .command("forget <key>")
  .description("Delete a memory")
  .action(async (key: string) => {
    const store = createStore(program.opts());
    const ok = await store.forget(key);
    console.log(ok ? `✓ Forgot "${key}"` : `✗ Key "${key}" not found`);
  });

program
  .command("list")
  .description("List all memory keys")
  .action(async () => {
    const store = createStore(program.opts());
    const keys = await store.keys();
    if (keys.length === 0) {
      console.log("No memories stored.");
      return;
    }
    keys.forEach(k => console.log(k));
  });

program
  .command("clear")
  .description("Clear all memories")
  .action(async () => {
    const store = createStore(program.opts());
    await store.clear();
    console.log("✓ All memories cleared");
  });

program.parse();
