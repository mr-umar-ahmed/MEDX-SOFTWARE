import { useStore } from "../data/store";
import { COMMON_TESTS } from "../catalog";

let syncInterval: any = null;
let lastSyncTime = 0;

export async function forceCloudSync() {
  const state = useStore.getState();
  
  // We only sync reported orders and patients associated with them
  // This minimizes payload and protects PII/financials of pending orders.
  const reportedOrders = state.orders.filter(o => o.status === "reported" || o.status === "delivered");
  const patientIds = new Set(reportedOrders.map(o => o.patientId));
  const patients = state.patients.filter(p => patientIds.has(p.id));
  
  const payload = {
    type: "FULL_SYNC",
    licenseKey: state.activeLicense?.licenseKey || "FREE-STARTER-TIER",
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
      orders: reportedOrders,
      patients: patients
    }
  };

  try {
    const response = await fetch("https://medx-web-one.vercel.app/api/sync", {
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

export function startSyncEngine() {
  if (syncInterval) return;
  
  // Sync every 5 minutes automatically
  syncInterval = setInterval(() => {
    forceCloudSync();
  }, 5 * 60 * 1000);
  
  // Also hook into Zustand to trigger immediate sync when a report is verified
  useStore.subscribe((state, prevState) => {
    // Check if the number of reported orders changed
    const reportedNow = state.orders.filter(o => o.status === "reported").length;
    const reportedBefore = prevState.orders.filter(o => o.status === "reported").length;
    
    if (reportedNow > reportedBefore) {
      // Delay slightly to batch rapid verifications
      setTimeout(() => {
        forceCloudSync();
      }, 2000);
    }
  });
  
  // Initial sync on startup
  setTimeout(() => forceCloudSync(), 3000);
}
