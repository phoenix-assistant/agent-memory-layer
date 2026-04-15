import Database from "better-sqlite3";
import type { Backend, MemoryEntry } from "../memory.js";

export class SqliteBackend implements Backend {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        embedding TEXT NOT NULL,
        session TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      )
    `);
  }

  async get(key: string): Promise<MemoryEntry | undefined> {
    const row = this.db.prepare("SELECT * FROM memories WHERE key = ?").get(key) as any;
    return row ? this.rowToEntry(row) : undefined;
  }

  async set(key: string, entry: MemoryEntry): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO memories (key, value, embedding, session, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      key,
      entry.value,
      JSON.stringify(entry.embedding),
      entry.session ?? null,
      entry.createdAt,
      entry.updatedAt,
      entry.metadata ? JSON.stringify(entry.metadata) : null
    );
  }

  async delete(key: string): Promise<boolean> {
    const result = this.db.prepare("DELETE FROM memories WHERE key = ?").run(key);
    return result.changes > 0;
  }

  async all(): Promise<MemoryEntry[]> {
    const rows = this.db.prepare("SELECT * FROM memories").all() as any[];
    return rows.map(r => this.rowToEntry(r));
  }

  async keys(): Promise<string[]> {
    const rows = this.db.prepare("SELECT key FROM memories").all() as any[];
    return rows.map(r => r.key);
  }

  async clear(): Promise<void> {
    this.db.exec("DELETE FROM memories");
  }

  close(): void {
    this.db.close();
  }

  private rowToEntry(row: any): MemoryEntry {
    return {
      key: row.key,
      value: row.value,
      embedding: JSON.parse(row.embedding),
      session: row.session ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
