import fs from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Storage seam (ADR-003 boundary discipline): all file I/O for media and
 * published output goes through this interface so the local-disk
 * implementation can be swapped for object storage (S3) without touching
 * route or publisher code.
 */
export interface StorageService {
  /** Stream a request body into storage. Returns the size written in bytes. */
  save(key: string, body: Readable): Promise<number>;
  readBuffer(key: string): Buffer | null;
  createReadStream(key: string): Readable;
  copy(sourceKey: string, destKey: string): boolean;
  writeText(key: string, content: string): void;
  readText(key: string): string | null;
  deleteFile(key: string): void;
  deleteDir(prefix: string): void;
  exists(key: string): boolean;
  /** Absolute path on the local filesystem, or null when not disk-backed. */
  absolutePath(key: string): string | null;
}

/** Local-disk implementation rooted at a base directory (e.g. data/media). */
export class LocalStorageService implements StorageService {
  constructor(private baseDir: string) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  private resolve(key: string): string {
    const resolved = path.resolve(this.baseDir, key);
    const base = path.resolve(this.baseDir);
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error(`Storage key escapes base directory: ${key}`);
    }
    return resolved;
  }

  async save(key: string, body: Readable): Promise<number> {
    const dest = this.resolve(key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await pipeline(body, fs.createWriteStream(dest));
    return fs.statSync(dest).size;
  }

  readBuffer(key: string): Buffer | null {
    const dest = this.resolve(key);
    return fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  }

  createReadStream(key: string): Readable {
    return fs.createReadStream(this.resolve(key));
  }

  copy(sourceKey: string, destKey: string): boolean {
    const src = this.resolve(sourceKey);
    if (!fs.existsSync(src)) return false;
    const dest = this.resolve(destKey);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
  }

  writeText(key: string, content: string): void {
    const dest = this.resolve(key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, 'utf8');
  }

  readText(key: string): string | null {
    const dest = this.resolve(key);
    return fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
  }

  deleteFile(key: string): void {
    fs.rmSync(this.resolve(key), { force: true });
  }

  deleteDir(prefix: string): void {
    fs.rmSync(this.resolve(prefix), { recursive: true, force: true });
  }

  exists(key: string): boolean {
    return fs.existsSync(this.resolve(key));
  }

  absolutePath(key: string): string | null {
    return this.resolve(key);
  }
}
