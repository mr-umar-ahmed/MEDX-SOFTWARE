import { useStore } from "../data/store";
import { COMMON_TESTS } from "../catalog";

let syncInterval: any = null;
let lastSyncTime = 0;

export async function forceCloudSync() {
  const state = useStore.getState();
  
  // We sync ALL orders and patients so the patient portal can show pending statuses
  const orders = state.orders;
  const patients = state.patients;
  
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
      orders: orders,
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

let debounceTimeout: any = null;

export function startSyncEngine() {
  if (syncInterval) return;
  
  // Sync every 5 minutes automatically
  syncInterval = setInterval(() => {
    forceCloudSync();
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
  
  // Initial sync on startup
  setTimeout(() => forceCloudSync(), 3000);
}
