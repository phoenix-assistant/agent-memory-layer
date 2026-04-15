import { embed, cosineSimilarity } from "./embeddings.js";

export interface MemoryEntry {
  key: string;
  value: string;
  embedding: number[];
  session?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface Backend {
  get(key: string): Promise<MemoryEntry | undefined>;
  set(key: string, entry: MemoryEntry): Promise<void>;
  delete(key: string): Promise<boolean>;
  all(): Promise<MemoryEntry[]>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface RecallResult {
  key: string;
  value: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryStoreOptions {
  backend: Backend;
  session?: string;
}

export class MemoryStore {
  private backend: Backend;
  private session?: string;

  constructor(opts: MemoryStoreOptions) {
    this.backend = opts.backend;
    this.session = opts.session;
  }

  /** Store a key-value pair with auto-generated embedding */
  async remember(key: string, value: string, metadata?: Record<string, unknown>): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.backend.get(key);
    const entry: MemoryEntry = {
      key,
      value,
      embedding: embed(value),
      session: this.session,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata,
    };
    await this.backend.set(key, entry);
  }

  /** Semantic search across memories, returns top-K results sorted by similarity */
  async recall(query: string, topK = 5): Promise<RecallResult[]> {
    const queryVec = embed(query);
    const all = await this.backend.all();

    // Filter by session if set
    const entries = this.session
      ? all.filter(e => !e.session || e.session === this.session)
      : all;

    const scored = entries.map(entry => ({
      key: entry.key,
      value: entry.value,
      score: cosineSimilarity(queryVec, entry.embedding),
      metadata: entry.metadata,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /** Delete a memory by key */
  async forget(key: string): Promise<boolean> {
    return this.backend.delete(key);
  }

  /** Get a specific memory by key */
  async get(key: string): Promise<MemoryEntry | undefined> {
    return this.backend.get(key);
  }

  /** List all keys */
  async keys(): Promise<string[]> {
    return this.backend.keys();
  }

  /** Clear all memories */
  async clear(): Promise<void> {
    return this.backend.clear();
  }
}
