import * as fs from "fs";
import * as path from "path";
import { webcrypto } from "crypto";

export interface LicenseRecord {
  id: string;
  token: string;
  labName: string;
  contactPhone: string;
  tier: "Starter" | "Pro" | "Enterprise";
  issuedAt: string;
  validUntil: string;
  status: "active" | "revoked";
  lastHeartbeatAt?: string;
  devices?: Array<{ deviceId: string; hostname: string; lastSeenAt: string }>;
}

const PRIVATE_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "UG_kZ8mA9UgIY8UCE5D0AbjhCRETeRfgAupo-_XhWg4",
  y: "71h7PikOhdbV0u41OdFbdjpQ51Gu7_EWnEU8R5t5P7g",
  d: "SZ3LmOxvIWTvJabGb8g5ltqbMl-kGCU64Z0VWu9amYk",
};

// Base64Url encoder helper
function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Generate ECDSA signature using SubtleCrypto
async function signData(dataStr: string): Promise<string> {
  const { subtle } = webcrypto;
  const key = await subtle.importKey(
    "jwk",
    PRIVATE_KEY_JWK,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(dataStr);

  const signatureBuffer = await subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    dataBytes
  );

  return bytesToBase64Url(new Uint8Array(signatureBuffer));
}

function getDbPath(): string {
  const dbDir = path.join(process.cwd(), "..", "..", "Database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, "admin-keys.json");
}

export async function getLicenses(): Promise<LicenseRecord[]> {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  } catch {
    return [];
  }
}

export async function saveLicenses(list: LicenseRecord[]): Promise<void> {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(list, null, 2), "utf-8");
}

export async function createLicense(
  labName: string,
  contactPhone: string,
  tier: "Starter" | "Pro" | "Enterprise",
  validDays: number
): Promise<LicenseRecord> {
  const id = "LIC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const issuedAt = new Date().toISOString();
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + validDays);
  const validUntil = expDate.toISOString();

  // Create license JSON body
  const licenseBody = {
    licenseKey: id,
    labName,
    contactPhone,
    issuedAt,
    validUntil,
    tier,
  };

  const bodyStr = JSON.stringify(licenseBody);
  const bodyB64 = bytesToBase64Url(new TextEncoder().encode(bodyStr));
  const sigB64 = await signData(bodyB64);

  const token = `${bodyB64}.${sigB64}`;

  const record: LicenseRecord = {
    id,
    token,
    labName,
    contactPhone,
    tier,
    issuedAt,
    validUntil,
    status: "active",
    devices: [],
  };

  const all = await getLicenses();
  all.unshift(record);
  await saveLicenses(all);

  return record;
}

export async function revokeLicense(id: string): Promise<void> {
  const all = await getLicenses();
  const updated = all.map((l) => (l.id === id ? { ...l, status: "revoked" as const } : l));
  await saveLicenses(updated);
}

export interface HeartbeatResult {
  success: boolean;
  active: boolean;
  error?: string;
}

export async function registerHeartbeat(
  id: string,
  deviceId: string,
  hostname: string
): Promise<HeartbeatResult> {
  const all = await getLicenses();
  const index = all.findIndex((l) => l.id === id);
  if (index === -1) {
    return { success: false, active: false, error: "License key is invalid." };
  }
  
  const license = all[index];
  if (license.status === "revoked") {
    return { success: true, active: false, error: "This license key has been revoked by administrators." };
  }

  // Device limits mapping
  const deviceLimits = {
    Starter: 1,
    Pro: 3,
    Enterprise: 999, // practically unlimited
  };

  const limit = deviceLimits[license.tier] || 1;
  const devicesList = license.devices || [];

  const existingDeviceIndex = devicesList.findIndex((d) => d.deviceId === deviceId);

  if (existingDeviceIndex !== -1) {
    // Device already registered, update check-in stats
    devicesList[existingDeviceIndex].lastSeenAt = new Date().toISOString();
    devicesList[existingDeviceIndex].hostname = hostname;
  } else {
    // New device connection request, verify limits
    if (devicesList.length >= limit) {
      return {
        success: true,
        active: false,
        error: `Device limit exceeded. Under your ${license.tier} plan, you are allowed up to ${limit} connected devices/installations. Please contact admin to upgrade.`,
      };
    }
    // Register new device
    devicesList.push({
      deviceId,
      hostname,
      lastSeenAt: new Date().toISOString(),
    });
  }

  license.devices = devicesList;
  license.lastHeartbeatAt = new Date().toISOString();
  all[index] = license;
  
  await saveLicenses(all);
  return { success: true, active: true };
}

