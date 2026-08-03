/**
 * File-backed persistent cache for Salesforce ops data.
 *
 * Writes to .sf-cache/ops.json in the server working directory so cached
 * values survive a process restart. Falls back gracefully if the directory
 * is unwritable — the caller sees a normal cache miss and re-fetches live.
 *
 * Interface mirrors the Map subset used by salesforce.ts so it can be a
 * drop-in replacement without touching call sites.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface CacheEntry { data: unknown; ts: number; }
type CacheStore = Record<string, CacheEntry>;

const CACHE_DIR  = join(process.cwd(), ".sf-cache");
const CACHE_FILE = join(CACHE_DIR, "ops.json");

function loadStore(): CacheStore {
  try {
    if (!existsSync(CACHE_FILE)) return {};
    return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as CacheStore;
  } catch {
    return {};
  }
}

function saveStore(store: CacheStore): void {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(store), "utf8");
  } catch {
    // Non-fatal: cache write failure just means the entry is memory-only
  }
}

export class SfPersistentCache {
  private store: CacheStore = loadStore();

  get(key: string): CacheEntry | undefined {
    return this.store[key];
  }

  set(key: string, value: CacheEntry): void {
    this.store[key] = value;
    saveStore(this.store);
  }

  delete(key: string): void {
    delete this.store[key];
    saveStore(this.store);
  }

  keys(): string[] {
    return Object.keys(this.store);
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.store, key);
  }

  get size(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
    saveStore(this.store);
  }
}
