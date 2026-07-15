import { useStore } from "../data/store";
import { COMMON_TESTS } from "../catalog";
import { checkLicenseHeartbeat } from "./licensing";

const WEB_URL = "https://medx-web-one.vercel.app";

let syncInterval: any = null;
let lastSyncTime = 0;

export async function forceCloudSync() {
  const state = useStore.getState();

  // Cloud sync powers the QR patient portal — a Pro/Enterprise feature.
  // Starter (or unlicensed) installs stay fully offline: no patient data
  // ever leaves the lab PC.
  const license = state.activeLicense;
  if (!license || license.tier === "Starter" || !state.licenseToken) return false;

  // We sync ALL orders and patients so the patient portal can show pending statuses
  const orders = state.orders;
  const patients = state.patients;

  const payload = {
    type: "FULL_SYNC",
    // The signed token authenticates this push server-side (a bare license
    // key is public information and proves nothing).
    licenseToken: state.licenseToken,
    labSettings: {
      name: state.settings.name,
      city: state.settings.city,
      addressLine: state.settings.addressLine,
      phone: state.settings.phone,
      email: state.settings.email,
    },
    catalog: COMMON_TESTS.map(t => ({
      code: t.code,
      name: t.name,
      category: t.category,
      price: t.defaultPricePaise / 100, // convert to rupees
    })),
    data: {
      orders: orders,
      patients: patients
    }
  };

  try {
    const response = await fetch(`${WEB_URL}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      lastSyncTime = Date.now();
      useStore.setState({ lastCloudSync: lastSyncTime });
      return true;
    }
    return false;
  } catch (err) {
    console.error("Cloud Sync Failed:", err);
    return false;
  }
}

interface WebBooking {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  age?: string;
  address: string;
  date: string;
  timeSlot: string;
  tests?: string;
}

/**
 * Pulls online home-collection bookings made on the public MedX website and
 * imports them as Scheduled home visits, then acknowledges them so the cloud
 * copy is deleted. Pro/Enterprise only (home collection is a Pro feature).
 */
export async function pullWebBookings(): Promise<number> {
  const state = useStore.getState();
  const license = state.activeLicense;
  if (!license || license.tier === "Starter" || !state.licenseToken) return 0;

  try {
    const res = await fetch(`${WEB_URL}/api/bookings`, {
      headers: { Authorization: `Bearer ${state.licenseToken}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    if (!data.success || !Array.isArray(data.bookings) || data.bookings.length === 0) return 0;

    const bookings: WebBooking[] = data.bookings;
    const existing = useStore.getState().homeVisits;
    let imported = 0;

    for (const b of bookings) {
      if (existing.some((v) => v.webRef === b.id)) continue;
      const noteParts = ["Booked online via MedX website"];
      if (b.age) noteParts.push(`Age ${b.age}`);
      if (b.tests) noteParts.push(`Tests: ${b.tests}`);
      useStore.getState().addHomeVisit({
        date: b.date,
        slot: b.timeSlot,
        patientName: b.name,
        phone: b.phone || undefined,
        address: b.address,
        status: "Scheduled",
        notes: noteParts.join(" · "),
        webRef: b.id,
      });
      imported++;
    }

    // Acknowledge everything we received (including duplicates) so the cloud
    // copy is cleaned up — the lab PC is now the source of truth for them.
    await fetch(`${WEB_URL}/api/bookings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.licenseToken}`,
      },
      body: JSON.stringify({ ackIds: bookings.map((b) => b.id) }),
    });

    return imported;
  } catch (err) {
    console.error("Web bookings pull failed:", err);
    return 0;
  }
}

/** Periodic license check-in: revocation, renewals, and vendor messages. */
async function runHeartbeat() {
  const state = useStore.getState();
  const license = state.activeLicense;
  if (!license || !state.licenseToken) return;
  await checkLicenseHeartbeat(license.licenseKey, state.licenseToken, {
    onRevoked: (reason) => {
      useStore.setState({ licenseToken: "", activeLicense: null });
      alert(reason || "Your MedX License key has been revoked by the system administrator.");
    },
    onTokenRefresh: (newToken, refreshed) => {
      useStore.setState({ licenseToken: newToken, activeLicense: refreshed });
      console.log(`✓ License refreshed by vendor: ${refreshed.tier} tier, valid until ${refreshed.validUntil}`);
    },
    onMessage: (message) => useStore.setState({ adminNotice: message }),
  });
}

let debounceTimeout: any = null;

export function startSyncEngine() {
  if (syncInterval) return;

  // Sync every 5 minutes automatically
  syncInterval = setInterval(() => {
    forceCloudSync();
    pullWebBookings();
    runHeartbeat();
  }, 5 * 60 * 1000);

  // Trigger instant sync (debounced) when orders or patients change
  useStore.subscribe((state, prevState) => {
    const ordersChanged = state.orders !== prevState.orders;
    const patientsChanged = state.patients !== prevState.patients;

    if (ordersChanged || patientsChanged) {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        forceCloudSync();
      }, 1500); // 1.5 second debounce to batch rapid typing/updates
    }
  });

  // Initial sync + booking pull on startup
  setTimeout(() => {
    forceCloudSync();
    pullWebBookings();
  }, 3000);
}
