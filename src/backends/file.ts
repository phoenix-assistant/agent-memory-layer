import fs from "node:fs";
import path from "node:path";
import type { Backend, MemoryEntry } from "../memory.js";

export class FileBackend implements Backend {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "{}");
  }

  private read(): Record<string, MemoryEntry> {
    const raw = fs.readFileSync(this.filePath, "utf-8");
    return JSON.parse(raw);
  }

  private write(data: Record<string, MemoryEntry>): void {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  async get(key: string): Promise<MemoryEntry | undefined> {
    return this.read()[key];
  }

  async set(key: string, entry: MemoryEntry): Promise<void> {
    const data = this.read();
    data[key] = entry;
    this.write(data);
  }

  async delete(key: string): Promise<boolean> {
    const data = this.read();
    if (!(key in data)) return false;
    delete data[key];
    this.write(data);
    return true;
  }

  async all(): Promise<MemoryEntry[]> {
    return Object.values(this.read());
  }

  async keys(): Promise<string[]> {
    return Object.keys(this.read());
  }

  async clear(): Promise<void> {
    this.write({});
  }
}
