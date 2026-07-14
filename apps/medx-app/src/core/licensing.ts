export interface LicenseData {
  licenseKey: string;
  labName: string;
  contactPhone: string;
  issuedAt: string; // ISO String
  validUntil: string; // ISO String
  tier: "Starter" | "Pro" | "Enterprise";
}

const PUBLIC_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "UG_kZ8mA9UgIY8UCE5D0AbjhCRETeRfgAupo-_XhWg4",
  y: "71h7PikOhdbV0u41OdFbdjpQ51Gu7_EWnEU8R5t5P7g",
};

// Base64Url string decoder helper
function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binaryString = atob(padded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function verifyLicenseToken(token: string): Promise<LicenseData | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [dataB64, sigB64] = parts;
    const dataStr = atob(dataB64.replace(/-/g, "+").replace(/_/g, "/"));
    const dataObj = JSON.parse(dataStr) as LicenseData;

    // Verify asymmetric signature using ECDSA P-256
    const key = await window.crypto.subtle.importKey(
      "jwk",
      PUBLIC_KEY_JWK,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(dataB64);
    const sigBytes = base64ToBytes(sigB64);

    const isValid = await window.crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      key,
      sigBytes as any,
      dataBytes as any
    );

    if (!isValid) return null;
    return dataObj;
  } catch (err) {
    console.error("Verification failed:", err);
    return null;
  }
}

/**
 * Check if a path is allowed based on the user's active license tier.
 */
export function isRouteAllowed(path: string, tier: "Starter" | "Pro" | "Enterprise"): boolean {
  if (tier === "Enterprise") return true;

  // Enterprise Tier Modules
  const enterpriseRoutes = ["/tpa", "/qc", "/temperature", "/calibrations", "/sops", "/audit", "/abdm", "/mis"];
  if (tier === "Pro") {
    return !enterpriseRoutes.some((p) => path.startsWith(p));
  }

  // Pro Tier Modules
  const proRoutes = ["/doctors", "/commission", "/mou", "/corporate", "/reagents", "/suppliers", "/home-collection", "/analytics", "/interfacing"];
  const restrictedForStarter = [...enterpriseRoutes, ...proRoutes];
  return !restrictedForStarter.some((p) => path.startsWith(p));
}

/**
 * Returns user-friendly name for a route tier requirement.
 */
export function getRouteTierRequired(path: string): "Pro" | "Enterprise" | "Starter" {
  const enterpriseRoutes = ["/tpa", "/qc", "/temperature", "/calibrations", "/sops", "/audit", "/abdm", "/mis"];
  if (enterpriseRoutes.some((p) => path.startsWith(p))) return "Enterprise";

  const proRoutes = ["/doctors", "/commission", "/mou", "/corporate", "/reagents", "/suppliers", "/home-collection", "/analytics", "/interfacing"];
  if (proRoutes.some((p) => path.startsWith(p))) return "Pro";

  return "Starter";
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "DEV-MOCK";
  let id = localStorage.getItem("medx-device-id");
  if (!id) {
    id = "DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("medx-device-id", id);
  }
  return id;
}

export async function getDeviceHostname(): Promise<string> {
  if (typeof window !== "undefined" && window.medx?.getHostname) {
    try {
      const hostname = await window.medx.getHostname();
      return hostname;
    } catch {
      // Fallback
    }
  }
  return typeof window !== "undefined" ? window.location.hostname : "unknown-pc";
}

/**
 * Pings the remote admin dashboard heartbeat endpoint to check if the license is still active.
 */
export async function checkLicenseHeartbeat(licenseKey: string, onRevoked: (reason?: string) => void): Promise<void> {
  try {
    const deviceId = getOrCreateDeviceId();
    const hostname = await getDeviceHostname();
    const adminUrl = "https://medx-admin-lac.vercel.app/api/heartbeat";
    const res = await fetch(adminUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, deviceId, hostname }),
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.active === false) {
        console.warn("Heartbeat warning: License revoked/invalid!", data.error);
        onRevoked(data.error || "License has been revoked by the system administrator.");
      }
    }
  } catch (err) {
    // Silently fail if offline, as the system works offline-first.
    console.log("Heartbeat skipped (network offline).");
  }
}

