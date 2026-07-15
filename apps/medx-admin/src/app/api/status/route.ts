import { NextResponse } from "next/server";
import { getLicenses } from "@/lib/adminDb";
import { readJson, writeJson, listJson } from "@/lib/cloudStore";

/**
 * Platform health + per-lab connectivity, aggregated for the Status page.
 * Protected by the admin auth proxy like every other admin API.
 */

const WEB_URL = process.env.MEDX_WEB_URL || "https://medx-web-one.vercel.app";

interface LabDoc {
  licenseKey: string;
  settings?: { name?: string; city?: string };
  orders?: unknown[];
  patients?: unknown[];
  lastSyncedAt?: string;
}

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs: number; detail?: string }> = {};

  // 1. Blob store: full write + read round-trip
  {
    const t0 = Date.now();
    try {
      const stamp = new Date().toISOString();
      await writeJson("admin-health-probe", { stamp });
      const back = await readJson<{ stamp?: string }>("admin-health-probe", {});
      checks.blobStore = {
        ok: back.stamp === stamp,
        latencyMs: Date.now() - t0,
      };
    } catch (err) {
      checks.blobStore = { ok: false, latencyMs: Date.now() - t0, detail: String(err) };
    }
  }

  // 2. Patient website (medx-web)
  {
    const t0 = Date.now();
    try {
      const res = await fetch(`${WEB_URL}/api/health`, { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      checks.patientWebsite = {
        ok: !!data?.ok,
        latencyMs: Date.now() - t0,
        detail: data ? `blob:${data.blob}` : `HTTP ${res.status}`,
      };
    } catch (err) {
      checks.patientWebsite = { ok: false, latencyMs: Date.now() - t0, detail: String(err) };
    }
  }

  // 3. Per-lab connectivity: license status + heartbeat + portal sync + bookings
  const labs: Array<{
    id: string;
    labName: string;
    tier: string;
    status: string;
    validUntil: string;
    devices: number;
    lastHeartbeatAt: string | null;
    lastSyncedAt: string | null;
    syncedPatients: number;
    syncedOrders: number;
    pendingBookings: number;
    adminMessage: string | null;
  }> = [];

  try {
    const [licenses, labDocs, bookingDocs] = await Promise.all([
      getLicenses(),
      listJson<LabDoc>("labs/"),
      listJson<unknown[]>("bookings/"),
    ]);

    const syncByKey = new Map(labDocs.map((d) => [d.value.licenseKey, d.value]));
    const bookingsByKey = new Map(
      bookingDocs.map((d) => [d.key.replace(/^bookings\//, ""), Array.isArray(d.value) ? d.value.length : 0])
    );

    const now = Date.now();
    for (const lic of licenses) {
      const sync = syncByKey.get(lic.id);
      labs.push({
        id: lic.id,
        labName: lic.labName,
        tier: lic.tier,
        status:
          lic.status === "revoked"
            ? "revoked"
            : new Date(lic.validUntil).getTime() < now
              ? "expired"
              : "active",
        validUntil: lic.validUntil,
        devices: lic.devices?.length ?? 0,
        lastHeartbeatAt: lic.lastHeartbeatAt ?? null,
        lastSyncedAt: sync?.lastSyncedAt ?? null,
        syncedPatients: sync?.patients?.length ?? 0,
        syncedOrders: sync?.orders?.length ?? 0,
        pendingBookings: bookingsByKey.get(lic.id) ?? 0,
        adminMessage: lic.adminMessage ?? null,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err), checks },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    time: new Date().toISOString(),
    checks,
    labs,
  });
}
