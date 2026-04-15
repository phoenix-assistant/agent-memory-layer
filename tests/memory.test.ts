import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryStore } from "../src/memory.js";
import { FileBackend } from "../src/backends/file.js";
import { embed, cosineSimilarity } from "../src/embeddings.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const tmpDir = path.join(os.tmpdir(), "agent-memory-test-" + Date.now());
const storePath = path.join(tmpDir, "test.json");

let store: MemoryStore;

beforeEach(() => {
  const backend = new FileBackend(storePath);
  store = new MemoryStore({ backend });
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
});

describe("embeddings", () => {
  it("produces consistent vectors", () => {
    const a = embed("hello world");
    const b = embed("hello world");
    expect(a).toEqual(b);
  });

  it("similar texts have higher similarity", () => {
    const a = embed("the cat sat on the mat");
    const b = embed("the cat is on the mat");
    const c = embed("quantum physics equations");
    expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c));
  });
});

describe("MemoryStore", () => {
  it("remember and get", async () => {
    await store.remember("greeting", "hello world");
    const entry = await store.get("greeting");
    expect(entry).toBeDefined();
    expect(entry!.value).toBe("hello world");
  });

  it("recall returns ranked results", async () => {
    await store.remember("cat-fact", "cats sleep 16 hours a day");
    await store.remember("dog-fact", "dogs are loyal companions");
    await store.remember("math", "pi is approximately 3.14159");

    const results = await store.recall("feline sleeping habits");
    expect(results.length).toBe(3);
    expect(results[0].key).toBe("cat-fact");
  });

  it("forget removes a memory", async () => {
    await store.remember("temp", "temporary data");
    expect(await store.forget("temp")).toBe(true);
    expect(await store.get("temp")).toBeUndefined();
    expect(await store.forget("nonexistent")).toBe(false);
  });

  it("keys lists all keys", async () => {
    await store.remember("a", "alpha");
    await store.remember("b", "beta");
    const keys = await store.keys();
    expect(keys).toContain("a");
    expect(keys).toContain("b");
  });

  it("clear removes everything", async () => {
    await store.remember("x", "data");
    await store.clear();
    expect(await store.keys()).toEqual([]);
  });

  it("session scoping works", async () => {
    const backend = new FileBackend(path.join(tmpDir, "session-test.json"));
    const s1 = new MemoryStore({ backend, session: "s1" });
    const s2 = new MemoryStore({ backend, session: "s2" });

    await s1.remember("a", "session 1 data");
    await s2.remember("b", "session 2 data");

    const r1 = await s1.recall("data");
    expect(r1.every(r => r.key !== "b" || r.value.includes("session 2"))).toBe(true);
  });
});
