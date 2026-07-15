import { get, put, list } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";

/**
 * Persistent JSON document store.
 *
 * Production: Vercel Blob (private store, authenticated via BLOB_READ_WRITE_TOKEN).
 * Local dev without a token: JSON files under the repo-root Database/ folder.
 *
 * Keys are logical names like "admin-keys" or "labs/LIC-XXXXXX"; each maps to
 * one JSON document.
 */

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function localDir(): string {
  const dir = path.join(process.cwd(), "..", "..", "Database");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function localPathFor(key: string): string {
  return path.join(localDir(), key.replace(/[/\\]/g, "__") + ".json");
}

function blobPathFor(key: string): string {
  return `${key}.json`;
}

/**
 * Read one JSON document. Returns `fallback` only when the document does not
 * exist yet. Any other storage failure throws, so callers doing
 * read-modify-write can never silently clobber data with the fallback.
 */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  if (hasBlob()) {
    const res = await get(blobPathFor(key), { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return fallback;
    const text = await new Response(res.stream).text();
    return JSON.parse(text) as T;
  }

  const p = localPathFor(key);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Write (create or overwrite) one JSON document. Throws on failure. */
export async function writeJson<T>(key: string, value: T): Promise<void> {
  const text = JSON.stringify(value, null, 2);

  if (hasBlob()) {
    await put(blobPathFor(key), text, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return;
  }

  fs.writeFileSync(localPathFor(key), text, "utf-8");
}

/**
 * List and read every JSON document whose key starts with `prefix`
 * (e.g. "labs/"). Returns [{ key, value }] with the ".json" suffix stripped.
 */
export async function listJson<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
  const out: Array<{ key: string; value: T }> = [];

  if (hasBlob()) {
    const { blobs } = await list({ prefix });
    for (const blob of blobs) {
      const res = await get(blob.pathname, { access: "private", useCache: false });
      if (!res || res.statusCode !== 200 || !res.stream) continue;
      try {
        const text = await new Response(res.stream).text();
        out.push({ key: blob.pathname.replace(/\.json$/, ""), value: JSON.parse(text) as T });
      } catch {
        // skip malformed documents
      }
    }
    return out;
  }

  const filePrefix = prefix.replace(/[/\\]/g, "__");
  const dir = localDir();
  for (const file of fs.readdirSync(dir)) {
    if (!file.startsWith(filePrefix) || !file.endsWith(".json")) continue;
    try {
      const value = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")) as T;
      out.push({ key: file.replace(/\.json$/, "").replace(/__/g, "/"), value });
    } catch {
      // skip malformed documents
    }
  }
  return out;
}
