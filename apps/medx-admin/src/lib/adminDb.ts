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

export interface CustomerNote {
  at: string;
  text: string;
  author: string;
}

export interface CustomerRecord {
  id: string;
  labName: string;
  contactPhone: string;
  location: string;
  gstin?: string;
  stage: "Lead" | "Trial" | "Active" | "Expired" | "Churned";
  notes: CustomerNote[];
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  amountPaidPaise: number;
  mode: "UPI" | "Bank Transfer" | "Card" | "Cash";
  referenceNo?: string;
  issuedAt: string;
  description?: string;
}

export interface TicketMessage {
  at: string;
  text: string;
  sender: "Staff" | "Customer";
}

export interface TicketRecord {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved";
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  allowAbdm: boolean;
  allowWhatsApp: boolean;
  allowSms: boolean;
  maintenanceMode: boolean;
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

const BUCKET_URL = "https://kvdb.io/cae41247-25e4-414b-b0fa-bf1b49651a2c";

function getDbDir(): string {
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV;
  const dbDir = isVercel
    ? "/tmp/medx-db"
    : path.join(process.cwd(), "..", "..", "Database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return dbDir;
}

async function readKey<T>(keyName: string, fallback: T): Promise<T> {
  const localPath = path.join(getDbDir(), `${keyName}.json`);

  // 1. Try fetching from remote persistent KV store
  try {
    const res = await fetch(`${BUCKET_URL}/${keyName}`, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const text = await res.text();
      // Cache locally
      try {
        fs.writeFileSync(localPath, text, "utf-8");
      } catch (e) {}
      return JSON.parse(text) as T;
    }
  } catch (err) {
    console.error(`KVDB Read Failed for ${keyName}, falling back to local files:`, err);
  }

  // 2. Fallback to local files
  if (fs.existsSync(localPath)) {
    try {
      return JSON.parse(fs.readFileSync(localPath, "utf-8")) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function writeKey<T>(keyName: string, value: T): Promise<void> {
  const text = JSON.stringify(value, null, 2);
  const localPath = path.join(getDbDir(), `${keyName}.json`);

  // 1. Write locally
  try {
    fs.writeFileSync(localPath, text, "utf-8");
  } catch (e) {}

  // 2. Write to remote persistent KV store
  try {
    await fetch(`${BUCKET_URL}/${keyName}`, {
      method: "PUT",
      body: text,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(`KVDB Write Failed for ${keyName}:`, err);
  }
}

export async function getLicenses(): Promise<LicenseRecord[]> {
  return readKey<LicenseRecord[]>("admin-keys", []);
}

export async function saveLicenses(list: LicenseRecord[]): Promise<void> {
  return writeKey<LicenseRecord[]>("admin-keys", list);
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

// --- CRM Helpers ---
export async function getCustomers(): Promise<CustomerRecord[]> {
  return readKey<CustomerRecord[]>("admin-customers", []);
}

export async function saveCustomers(list: CustomerRecord[]): Promise<void> {
  return writeKey<CustomerRecord[]>("admin-customers", list);
}

export async function createCustomer(
  labName: string,
  contactPhone: string,
  location: string,
  gstin?: string
): Promise<CustomerRecord> {
  const record: CustomerRecord = {
    id: "CUST-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    labName,
    contactPhone,
    location,
    gstin,
    stage: "Lead",
    notes: [],
    createdAt: new Date().toISOString(),
  };
  const list = await getCustomers();
  list.unshift(record);
  await saveCustomers(list);
  return record;
}

// --- Billing Helpers ---
export async function getPayments(): Promise<PaymentRecord[]> {
  return readKey<PaymentRecord[]>("admin-payments", []);
}

export async function savePayments(list: PaymentRecord[]): Promise<void> {
  return writeKey<PaymentRecord[]>("admin-payments", list);
}

export async function createPayment(
  customerId: string,
  customerName: string,
  amountPaidPaise: number,
  mode: PaymentRecord["mode"],
  referenceNo?: string,
  description?: string
): Promise<PaymentRecord> {
  const record: PaymentRecord = {
    id: "PAY-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    customerId,
    customerName,
    amountPaidPaise,
    mode,
    referenceNo,
    description,
    issuedAt: new Date().toISOString(),
  };
  const list = await getPayments();
  list.unshift(record);
  await savePayments(list);
  return record;
}

// --- Tickets Helpers ---
export async function getTickets(): Promise<TicketRecord[]> {
  return readKey<TicketRecord[]>("admin-tickets", []);
}

export async function saveTickets(list: TicketRecord[]): Promise<void> {
  return writeKey<TicketRecord[]>("admin-tickets", list);
}

export async function createTicket(
  customerId: string,
  customerName: string,
  subject: string,
  description: string,
  priority: TicketRecord["priority"]
): Promise<TicketRecord> {
  const record: TicketRecord = {
    id: "TCK-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    customerId,
    customerName,
    subject,
    description,
    priority,
    status: "Open",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const list = await getTickets();
  list.unshift(record);
  await saveTickets(list);
  return record;
}

// --- Config Helpers ---
export async function getGlobalConfig(): Promise<AppConfig> {
  return readKey<AppConfig>("admin-config", {
    allowAbdm: true,
    allowWhatsApp: true,
    allowSms: true,
    maintenanceMode: false,
  });
}

export async function saveGlobalConfig(config: AppConfig): Promise<void> {
  return writeKey<AppConfig>("admin-config", config);
}


