"use server";

import { listJson } from "@/lib/cloudStore";

const ADMIN_URL = process.env.MEDX_ADMIN_URL || "https://medx-admin-lac.vercel.app";

interface LabDocument {
  licenseKey: string;
  settings?: {
    name?: string;
    city?: string;
    addressLine?: string;
    phone?: string;
    email?: string;
  };
  catalog?: Array<{ code: string; name: string; category: string; price: number }>;
  orders?: any[];
  patients?: any[];
  lastSyncedAt?: string;
}

interface DirectoryLab {
  id: string;
  labName: string;
  contactPhone: string;
  tier: "Starter" | "Pro" | "Enterprise";
  status: "active" | "inactive";
}

async function getDirectory(): Promise<DirectoryLab[]> {
  try {
    const res = await fetch(`${ADMIN_URL}/api/labs-directory`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.labs) ? data.labs : [];
  } catch {
    return [];
  }
}

async function getSyncedLabDocs(): Promise<LabDocument[]> {
  try {
    const docs = await listJson<LabDocument>("labs/");
    return docs.map((d) => d.value);
  } catch (err) {
    console.error("Failed to list synced lab documents:", err);
    return [];
  }
}

export async function verifyAndFetchReport(invoiceNo: string, phone: string) {
  try {
    const directory = await getDirectory();
    const labs = await getSyncedLabDocs();

    let foundOrder: any = null;
    let foundPatient: any = null;
    let foundLab: LabDocument | null = null;

    for (const lab of labs) {
      // Hide labs whose license was revoked after their last sync
      const dirEntry = directory.find((d) => d.id === lab.licenseKey);
      if (dirEntry && dirEntry.status !== "active") continue;

      const order = lab.orders?.find(
        (o: any) => o.invoiceNo?.trim().toUpperCase() === invoiceNo.trim().toUpperCase()
      );
      if (order) {
        foundOrder = order;
        foundLab = lab;
        foundPatient = lab.patients?.find((p: any) => p.id === order.patientId);
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
    const cleanPatientPhone = String(foundPatient.phone || "").replace(/\D/g, "");

    if (cleanPatientPhone.slice(-10) !== cleanInputPhone.slice(-10)) {
      return { error: "Phone number does not match our records for this invoice." };
    }

    // All orders for this patient from the same lab (report history)
    const patientOrders = (foundLab!.orders || [])
      .filter((o: any) => o.patientId === foundPatient.id)
      .sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return {
      success: true,
      patient: foundPatient,
      orders: patientOrders,
    };
  } catch (error) {
    console.error("Portal report lookup failed:", error);
    return { error: "Internal Server Error. Please try again later." };
  }
}

/**
 * Returns all active labs registered in the Admin Panel, merged with synced
 * lab settings/catalogs from the blob store.
 */
export async function getSyncedLabs() {
  try {
    const [directory, labDocs] = await Promise.all([getDirectory(), getSyncedLabDocs()]);

    const mergedList: any[] = [];

    // Synced labs first (they carry catalog + location details)
    for (const lab of labDocs) {
      const dirEntry = directory.find((d) => d.id === lab.licenseKey);
      if (dirEntry && dirEntry.status !== "active") continue; // skip revoked labs

      mergedList.push({
        id: lab.licenseKey,
        name: lab.settings?.name || dirEntry?.labName || "Unnamed Lab",
        location: `${lab.settings?.city || "Unknown Location"} - ${lab.settings?.addressLine || ""}`,
        city: lab.settings?.city || "Unknown",
        phone: lab.settings?.phone || dirEntry?.contactPhone || "",
        email: lab.settings?.email || "",
        catalog: lab.catalog || [],
        synced: true,
      });
    }

    // Directory labs that haven't pushed a sync yet
    for (const dirEntry of directory) {
      if (dirEntry.status !== "active") continue;
      if (mergedList.some((l) => l.id === dirEntry.id)) continue;
      mergedList.push({
        id: dirEntry.id,
        name: dirEntry.labName,
        location: "Awaiting first setup",
        city: "Awaiting Setup",
        phone: dirEntry.contactPhone,
        email: "",
        catalog: [],
        synced: false,
      });
    }

    return mergedList;
  } catch {
    return [];
  }
}
