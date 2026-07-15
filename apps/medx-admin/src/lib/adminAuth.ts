/**
 * Admin session tokens: `<expiryMs>.<hex HMAC-SHA256(expiryMs)>` signed with
 * SESSION_SECRET (falls back to ADMIN_PASSWORD). Uses WebCrypto only, so the
 * same code runs in route handlers and in proxy.ts.
 */

export const ADMIN_COOKIE = "medx_admin_session";

const encoder = new TextEncoder();

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function createSessionToken(ttlMs = 7 * 24 * 60 * 60 * 1000): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD / SESSION_SECRET env var is not configured.");
  const exp = String(Date.now() + ttlMs);
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(exp));
  return `${exp}.${bufToHex(sig)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sigHex = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  if (!/^[0-9a-f]{64}$/.test(sigHex)) return false;
  try {
    const key = await importHmacKey(secret);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBuf(sigHex) as unknown as ArrayBuffer,
      encoder.encode(exp)
    );
  } catch {
    return false;
  }
}

/** Constant-time-ish password check via SHA-256 digest comparison. */
export async function checkPassword(candidate: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !candidate) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const ua = new Uint8Array(a);
  const ub = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}
