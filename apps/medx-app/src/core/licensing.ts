export interface LicenseData {
  licenseKey: string;
  labName: string;
  contactPhone: string;
  issuedAt: string; // ISO String
  validUntil: string; // ISO String
  tier: "Starter" | "Pro" | "Enterprise";
}

// Public half of the license-signing keypair (rotated 2026-07-15; the private
// key lives only in the admin panel's environment variables).
const PUBLIC_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "lqhaPVXKqrbQgW9KJlxziq8aH8FTW5uOCTdo4zrdbN8",
  y: "P072Kzde3IUJz3KFPmDfc4FUEWcrf9wBFJvAlk-ioY8",
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

/**
 * Removes every whitespace character from a pasted token. Tokens travel to
 * labs over WhatsApp/email, which love to inject line breaks — one invisible
 * newline makes a perfectly valid token fail verification.
 */
export function sanitizeToken(raw: string): string {
  return raw.replace(/\s+/g, "");
}

export async function verifyLicenseToken(rawToken: string): Promise<LicenseData | null> {
  try {
    const token = sanitizeToken(rawToken);
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

export interface HeartbeatCallbacks {
  onRevoked: (reason?: string) => void;
  /** A renewed/re-tiered token was issued by the admin — store it. */
  onTokenRefresh?: (newToken: string, license: LicenseData) => void;
  /** Admin message for this lab (null = no active message → clear banner). */
  onMessage?: (message: string | null) => void;
}

/** Outcome of one heartbeat attempt — shown to the user in Settings. */
export interface HeartbeatOutcome {
  at: string;
  ok: boolean;
  message: string;
}

/**
 * Pings the remote admin dashboard heartbeat endpoint. Besides the active/
 * revoked check, the heartbeat doubles as a control channel: it delivers
 * license renewals/tier changes (a re-signed token, verified locally before
 * being accepted) and admin messages to display inside the app.
 */
export async function checkLicenseHeartbeat(
  licenseKey: string,
  currentToken: string,
  callbacks: HeartbeatCallbacks
): Promise<HeartbeatOutcome> {
  const at = new Date().toISOString();
  try {
    const deviceId = getOrCreateDeviceId();
    const hostname = (await getDeviceHostname()) || "unknown-pc";
    const adminUrl = "https://medx-admin-lac.vercel.app/api/heartbeat";
    const res = await fetch(adminUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, deviceId, hostname, currentToken }),
    });

    if (!res.ok) {
      return { at, ok: false, message: `License server responded with HTTP ${res.status}.` };
    }

    const data = await res.json();
    if (data.success && data.active === false) {
      // Only deactivate for definitive reasons. "unknown_key" can be a
      // transient server/storage issue — a cryptographically valid token
      // must not be dropped because of it (offline-first principle).
      if (data.code === "unknown_key") {
        console.warn("Heartbeat: server did not recognize the license key (keeping license).");
        return { at, ok: false, message: "Server does not recognize this license key. Contact your vendor." };
      }
      console.warn("Heartbeat warning: License revoked/blocked!", data.error);
      callbacks.onRevoked(data.error || "License has been revoked by the system administrator.");
      return { at, ok: false, message: data.error || "License revoked by the administrator." };
    }

    // Renewal / plan-change propagation — never trust the wire blindly:
    // the refreshed token must pass local signature verification.
    let refreshed = false;
    if (data.token && data.token !== currentToken && callbacks.onTokenRefresh) {
      const verified = await verifyLicenseToken(data.token);
      if (verified && verified.licenseKey === licenseKey) {
        callbacks.onTokenRefresh(data.token, verified);
        refreshed = true;
      }
    }

    callbacks.onMessage?.(typeof data.adminMessage === "string" && data.adminMessage ? data.adminMessage : null);
    return {
      at,
      ok: true,
      message: refreshed
        ? "Connected — license updated by vendor (new validity/plan applied)."
        : "Connected — license active, device registered.",
    };
  } catch (err) {
    // The system works offline-first — a failed check-in never blocks work.
    console.log("Heartbeat skipped (network unreachable).");
    return { at, ok: false, message: "Could not reach the license server — check internet/firewall. The app keeps working offline." };
  }
}

