import { webcrypto } from "crypto";

/**
 * Signature-only verification of a MedX license token
 * (format: base64url(JSON).base64url(ECDSA-P256-signature)).
 *
 * Used by the heartbeat endpoint to prove that a caller already holds a
 * genuine token for a license before handing it the current (possibly
 * renewed) token. Expiry is deliberately ignored here — an expired-but-
 * genuine token is exactly what a lab presents when its renewal needs to
 * propagate.
 */

export interface TokenPayload {
  licenseKey: string;
  labName: string;
  contactPhone: string;
  issuedAt: string;
  validUntil: string;
  tier: "Starter" | "Pro" | "Enterprise";
}

// Public half of the license-signing keypair (rotated 2026-07-15).
const PUBLIC_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "lqhaPVXKqrbQgW9KJlxziq8aH8FTW5uOCTdo4zrdbN8",
  y: "P072Kzde3IUJz3KFPmDfc4FUEWcrf9wBFJvAlk-ioY8",
};

function base64UrlToBytes(b64url: string): Uint8Array {
  const normalized = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Uint8Array.from(Buffer.from(normalized + "=".repeat(padLen), "base64"));
}

/** Returns the token's payload when the signature is genuine, else null. */
export async function verifyTokenSignature(
  token: string | null | undefined
): Promise<TokenPayload | null> {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [dataB64, sigB64] = parts;

    const payload = JSON.parse(
      Buffer.from(base64UrlToBytes(dataB64)).toString("utf-8")
    ) as TokenPayload;

    const { subtle } = webcrypto;
    const key = await subtle.importKey(
      "jwk",
      PUBLIC_KEY_JWK,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    const isValid = await subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      key,
      base64UrlToBytes(sigB64),
      new TextEncoder().encode(dataB64)
    );

    return isValid ? payload : null;
  } catch {
    return null;
  }
}
