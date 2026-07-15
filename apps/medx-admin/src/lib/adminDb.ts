import { webcrypto } from "crypto";
import { readJson, writeJson, listJson, deleteJson } from "./cloudStore";

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
  /** Message delivered to the lab's desktop app on its next heartbeat. */
  adminMessage?: string;
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

/**
 * License-signing private key (ECDSA P-256 JWK). Loaded from the environment —
 * it must never appear in the repository. Set LICENSE_PRIVATE_KEY_JWK to the
 * full JWK JSON: {"kty":"EC","crv":"P-256","x":"...","y":"...","d":"..."}
 */
function getPrivateKeyJwk(): JsonWebKey {
  const raw = process.env.LICENSE_PRIVATE_KEY_JWK;
  if (!raw) {
    throw new Error(
      "LICENSE_PRIVATE_KEY_JWK env var is not set. License signing is disabled until it is configured."
    );
  }
  return JSON.parse(raw) as JsonWebKey;
}

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
    getPrivateKeyJwk(),
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

/**
 * Licenses are stored as ONE document per license ("license/<id>").
 *
 * They used to live in a single shared array ("admin-keys"), but concurrent
 * serverless invocations doing read-modify-write on that one blob raced each
 * other: a heartbeat for lab A could resurrect a just-revoked lab B or erase
 * a just-created license entirely. Per-license documents make every routine
 * operation touch only its own record.
 */
const LICENSE_PREFIX = "license/";

async function loadLicense(id: string): Promise<LicenseRecord | null> {
  return readJson<LicenseRecord | null>(LICENSE_PREFIX + id, null);
}

async function saveLicense(record: LicenseRecord): Promise<void> {
  await writeJson(LICENSE_PREFIX + record.id, record);
}

/** One-time migration of any records still in the legacy shared blob. */
async function migrateLegacyLicenses(): Promise<LicenseRecord[]> {
  const legacy = await readJson<LicenseRecord[]>("admin-keys", []);
  if (legacy.length === 0) return [];
  const migrated: LicenseRecord[] = [];
  for (const record of legacy) {
    const existing = await loadLicense(record.id);
    if (!existing) {
      await saveLicense(record);
      migrated.push(record);
    }
  }
  await writeJson<LicenseRecord[]>("admin-keys", []); // drain so this runs once
  return migrated;
}

export async function getLicenses(): Promise<LicenseRecord[]> {
  const docs = await listJson<LicenseRecord>(LICENSE_PREFIX);
  const list = docs.map((d) => d.value);
  const known = new Set(list.map((l) => l.id));
  for (const rec of await migrateLegacyLicenses()) {
    if (!known.has(rec.id)) list.push(rec);
  }
  return list.sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );
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

  await saveLicense(record);
  return record;
}

export async function revokeLicense(id: string): Promise<void> {
  const record = await loadLicense(id);
  if (!record) return;
  record.status = "revoked";
  await saveLicense(record);
}

export async function reactivateLicense(id: string): Promise<void> {
  const record = await loadLicense(id);
  if (!record) return;
  record.status = "active";
  await saveLicense(record);
}

/**
 * Permanently deletes a license record. Guarded: only revoked licenses can
 * be deleted, so an active customer can't be wiped by accident.
 */
export async function deleteLicense(id: string): Promise<{ ok: boolean; error?: string }> {
  const record = await loadLicense(id);
  if (!record) return { ok: false, error: "License not found." };
  if (record.status !== "revoked") {
    return { ok: false, error: "Only revoked licenses can be deleted. Revoke it first." };
  }
  await deleteJson(LICENSE_PREFIX + id);
  return { ok: true };
}

/** Re-signs a license token after its tier or validity changed. */
async function resignToken(record: LicenseRecord): Promise<string> {
  const licenseBody = {
    licenseKey: record.id,
    labName: record.labName,
    contactPhone: record.contactPhone,
    issuedAt: record.issuedAt,
    validUntil: record.validUntil,
    tier: record.tier,
  };
  const bodyB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(licenseBody)));
  const sigB64 = await signData(bodyB64);
  return `${bodyB64}.${sigB64}`;
}

/**
 * Extends a license by `days`, counted from its current expiry (or from now
 * if it already lapsed). Re-signs the token so the renewal propagates to the
 * lab's desktop app on its next heartbeat.
 */
export async function extendLicense(id: string, days: number): Promise<LicenseRecord | null> {
  const record = await loadLicense(id);
  if (!record) return null;

  const base = Math.max(new Date(record.validUntil).getTime(), Date.now());
  record.validUntil = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
  record.token = await resignToken(record);
  await saveLicense(record);
  return record;
}

/** Upgrades/downgrades a license tier and re-signs its token. */
export async function setLicenseTier(
  id: string,
  tier: "Starter" | "Pro" | "Enterprise"
): Promise<LicenseRecord | null> {
  const record = await loadLicense(id);
  if (!record) return null;

  record.tier = tier;
  record.token = await resignToken(record);
  await saveLicense(record);
  return record;
}

/** Frees a device slot (e.g. the lab replaced a PC). */
export async function removeLicenseDevice(id: string, deviceId: string): Promise<boolean> {
  const record = await loadLicense(id);
  if (!record) return false;

  const before = record.devices?.length ?? 0;
  record.devices = (record.devices || []).filter((d) => d.deviceId !== deviceId);
  await saveLicense(record);
  return (record.devices?.length ?? 0) < before;
}

/** Sets (or clears, with an empty string) the lab's heartbeat message. */
export async function setLicenseMessage(id: string, message: string): Promise<void> {
  const record = await loadLicense(id);
  if (!record) return;
  record.adminMessage = message.trim() || undefined;
  await saveLicense(record);
}

export interface HeartbeatResult {
  success: boolean;
  active: boolean;
  error?: string;
  /** Machine-readable reason so the client can react appropriately. */
  code?: "revoked" | "unknown_key" | "device_limit";
  record?: LicenseRecord;
}

export async function registerHeartbeat(
  id: string,
  deviceId: string,
  hostname: string
): Promise<HeartbeatResult> {
  let license = await loadLicense(id);
  if (!license) {
    // The record may still live in the legacy shared blob — migrate and retry.
    await migrateLegacyLicenses();
    license = await loadLicense(id);
  }
  if (!license) {
    return {
      success: true,
      active: false,
      code: "unknown_key",
      error: "License key is not recognized.",
    };
  }

  if (license.status === "revoked") {
    return {
      success: true,
      active: false,
      code: "revoked",
      error: "This license key has been revoked by administrators.",
      record: license,
    };
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
        code: "device_limit",
        error: `Device limit exceeded. Under your ${license.tier} plan, you are allowed up to ${limit} connected devices/installations. Please contact admin to upgrade.`,
        record: license,
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

  await saveLicense(license);
  return { success: true, active: true, record: license };
}

// --- CRM Helpers ---
export async function getCustomers(): Promise<CustomerRecord[]> {
  return readJson<CustomerRecord[]>("admin-customers", []);
}

export async function saveCustomers(list: CustomerRecord[]): Promise<void> {
  return writeJson<CustomerRecord[]>("admin-customers", list);
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
  return readJson<PaymentRecord[]>("admin-payments", []);
}

export async function savePayments(list: PaymentRecord[]): Promise<void> {
  return writeJson<PaymentRecord[]>("admin-payments", list);
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
  return readJson<TicketRecord[]>("admin-tickets", []);
}

export async function saveTickets(list: TicketRecord[]): Promise<void> {
  return writeJson<TicketRecord[]>("admin-tickets", list);
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
  return readJson<AppConfig>("admin-config", {
    allowAbdm: true,
    allowWhatsApp: true,
    allowSms: true,
    maintenanceMode: false,
  });
}

export async function saveGlobalConfig(config: AppConfig): Promise<void> {
  return writeJson<AppConfig>("admin-config", config);
}


