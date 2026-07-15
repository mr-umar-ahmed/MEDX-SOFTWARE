import { webcrypto } from "crypto";

/**
 * Server-side verification of MedX license tokens
 * (format: base64url(JSON).base64url(ECDSA-P256-signature)).
 *
 * Desktop apps prove their identity to medx-web APIs by presenting their
 * signed license token — lab license IDs are public (labs directory), so a
 * bare ID is identification, not authentication.
 */

export interface LicenseData {
  licenseKey: string;
  labName: string;
  contactPhone: string;
  issuedAt: string;
  validUntil: string;
  tier: "Starter" | "Pro" | "Enterprise";
}

// Public half of the license-signing keypair (rotated 2026-07-15). Must match
// apps/medx-app/src/core/licensing.ts and the admin panel's private key.
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

/** Returns the verified license payload, or null when invalid/expired. */
export async function verifyLicenseToken(token: string | null | undefined): Promise<LicenseData | null> {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [dataB64, sigB64] = parts;

    const dataObj = JSON.parse(
      Buffer.from(base64UrlToBytes(dataB64)).toString("utf-8")
    ) as LicenseData;

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
    if (!isValid) return null;

    if (new Date(dataObj.validUntil).getTime() < Date.now()) return null;

    return dataObj;
  } catch {
    return null;
  }
}

/** Extracts and verifies the token from an Authorization: Bearer header. */
export async function verifyBearerLicense(req: Request): Promise<LicenseData | null> {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return verifyLicenseToken(header.slice(7).trim());
}
