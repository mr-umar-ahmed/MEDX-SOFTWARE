"use server";

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "cloud-db.json");

export async function verifyAndFetchReport(invoiceNo: string, phone: string) {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { error: "No records synced to cloud yet. Please try again later." };
    }
    
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    if (!db.labs) db.labs = {};
    
    let foundOrder: any = null;
    let foundPatient: any = null;
    let foundLabKey: string | null = null;
    
    // Search for the order in all partitioned labs
    for (const [key, lab] of Object.entries(db.labs)) {
      const order = (lab as any).orders?.find(
        (o: any) => o.invoiceNo.trim().toUpperCase() === invoiceNo.trim().toUpperCase()
      );
      if (order) {
        foundOrder = order;
        foundLabKey = key;
        foundPatient = (lab as any).patients?.find((p: any) => p.id === order.patientId);
        break;
      }
    }

    if (!foundOrder) {
      return { error: "Invalid Invoice Number." };
    }
    
    if (!foundPatient) {
      return { error: "Patient record not found." };
    }

    // Normalize phone numbers for matching
    const cleanInputPhone = phone.replace(/\D/g, "");
    const cleanPatientPhone = foundPatient.phone.replace(/\D/g, "");
    
    if (cleanPatientPhone.slice(-10) !== cleanInputPhone.slice(-10)) {
      return { error: "Phone number does not match our records for this invoice." };
    }
    
    // Get all orders for this patient from the same lab to show report history
    const labData = db.labs[foundLabKey!];
    const patientOrders = labData.orders
      .filter((o: any) => o.patientId === foundPatient.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      success: true,
      patient: foundPatient,
      orders: patientOrders,
    };
  } catch (error: any) {
    return { error: "Internal Server Error. Please try again later." };
  }
}

/**
 * Returns all active labs registered in the Admin Panel database, merged with synced pricing/locations.
 */
export async function getSyncedLabs() {
  try {
    let adminLabs: any[] = [];
    try {
      const res = await fetch("https://medx-admin-lac.vercel.app/api/licenses", {
        next: { revalidate: 15 } // revalidate every 15 seconds
      });
      const data = await res.json();
      if (data.success && data.licenses) {
        adminLabs = data.licenses;
      }
    } catch (e) {
      console.log("Failed to fetch licenses from admin panel, relying on local sync store.");
    }

    // Read synced labs
    let syncedLabs: Record<string, any> = {};
    if (fs.existsSync(DB_PATH)) {
      const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      syncedLabs = db.labs || {};
    }

    // Merge: Active admin licenses get priority or fallback
    const mergedList: any[] = [];

    // First add all synced labs
    Object.entries(syncedLabs).forEach(([key, lab]: [string, any]) => {
      // Find matching admin lab to verify status
      const adminMatch = adminLabs.find((l: any) => l.id === key);
      const isRevoked = adminMatch?.status === "revoked";
      if (isRevoked) return; // skip revoked labs

      mergedList.push({
        id: key,
        name: lab.settings?.name || adminMatch?.labName || "Unnamed Lab",
        location: `${lab.settings?.city || "Unknown Location"} - ${lab.settings?.addressLine || ""}`,
        city: lab.settings?.city || "Unknown",
        phone: lab.settings?.phone || adminMatch?.contactPhone || "",
        email: lab.settings?.email || "",
        catalog: lab.catalog || [],
        synced: true,
      });
    });

    // Add admin labs that haven't synced yet
    adminLabs.forEach((adminLab: any) => {
      if (adminLab.status === "revoked") return;
      const alreadyAdded = mergedList.some((l) => l.id === adminLab.id);
      if (!alreadyAdded) {
        mergedList.push({
          id: adminLab.id,
          name: adminLab.labName,
          location: "Awaiting first setup",
          city: "Awaiting Setup",
          phone: adminLab.contactPhone,
          email: "",
          catalog: [],
          synced: false,
        });
      }
    });

    return mergedList;
  } catch (e) {
    return [];
  }
}
