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

    const cleanInputPhone = phone.replace(/\D/g, "");
    if (cleanInputPhone.length < 10) {
      return { error: "Please enter a valid 10-digit registered mobile number." };
    }

    let foundPatient: any = null;
    let foundLab: LabDocument | null = null;

    // 1. If invoice number is provided, try invoice matching first
    if (invoiceNo && invoiceNo.trim()) {
      const cleanInv = invoiceNo.trim().toUpperCase();
      for (const lab of labs) {
        const dirEntry = directory.find((d) => d.id === lab.licenseKey);
        if (dirEntry && dirEntry.status !== "active") continue;

        const order = lab.orders?.find(
          (o: any) => o.invoiceNo?.trim().toUpperCase() === cleanInv
        );
        if (order) {
          const patient = lab.patients?.find((p: any) => p.id === order.patientId);
          if (patient) {
            const cleanPatientPhone = String(patient.phone || "").replace(/\D/g, "");
            if (cleanPatientPhone.slice(-10) === cleanInputPhone.slice(-10)) {
              foundPatient = patient;
              foundLab = lab;
              break;
            }
          }
        }
      }
    }

    // 2. If no direct invoice match, search patient records by mobile number
    if (!foundPatient) {
      for (const lab of labs) {
        const dirEntry = directory.find((d) => d.id === lab.licenseKey);
        if (dirEntry && dirEntry.status !== "active") continue;

        const patient = lab.patients?.find((p: any) => {
          const cleanP = String(p.phone || "").replace(/\D/g, "");
          return cleanP.slice(-10) === cleanInputPhone.slice(-10);
        });

        if (patient) {
          foundPatient = patient;
          foundLab = lab;
          break;
        }
      }
    }

    if (!foundPatient || !foundLab) {
      return { error: "No report records found matching this mobile number or invoice." };
    }

    // Retrieve all historical orders for this patient from the lab
    const patientOrders = (foundLab.orders || [])
      .filter((o: any) => o.patientId === foundPatient.id)
      .sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return {
      success: true,
      labName: foundLab.settings?.name || "Diagnostic Laboratory",
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
