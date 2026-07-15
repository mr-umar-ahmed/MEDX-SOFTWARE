import { NextResponse } from "next/server";
import { writeJson } from "@/lib/cloudStore";
import { verifyLicenseToken } from "@/lib/licenseVerify";

/**
 * Receives the cloud-sync push from a licensed lab's desktop app and stores it
 * as a per-lab document ("labs/<licenseKey>") in the private blob store.
 *
 * The license key is validated against the admin panel's public labs
 * directory: unknown, revoked/expired, or Starter-tier keys are rejected
 * (the patient portal is a Pro/Enterprise feature).
 */

const ADMIN_URL = process.env.MEDX_ADMIN_URL || "https://medx-admin-lac.vercel.app";

function setCorsHeaders(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

interface DirectoryLab {
  id: string;
  labName: string;
  tier: "Starter" | "Pro" | "Enterprise";
  status: "active" | "inactive";
}

async function lookupLicense(licenseKey: string): Promise<DirectoryLab | null> {
  try {
    const res = await fetch(`${ADMIN_URL}/api/labs-directory`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !Array.isArray(data.labs)) return null;
    return data.labs.find((l: DirectoryLab) => l.id === licenseKey) ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { licenseToken, labSettings, catalog, data } = payload;

    if (!licenseToken || !labSettings) {
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: "Missing license token or lab settings" },
          { status: 400 }
        )
      );
    }

    // Lab IDs are public (labs directory) — only the cryptographically signed
    // license token proves the push really comes from that lab's software.
    const verified = await verifyLicenseToken(String(licenseToken));
    if (!verified) {
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: "Invalid or expired license token." },
          { status: 401 }
        )
      );
    }
    const licenseKey = verified.licenseKey;

    const lab = await lookupLicense(licenseKey);
    if (!lab || lab.status !== "active") {
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: "License key is not recognized or is inactive." },
          { status: 403 }
        )
      );
    }
    if (lab.tier === "Starter") {
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: "Patient portal sync requires a Pro or Enterprise plan." },
          { status: 403 }
        )
      );
    }

    await writeJson(`labs/${licenseKey}`, {
      licenseKey,
      settings: labSettings,
      catalog: catalog || [],
      orders: data?.orders || [],
      patients: data?.patients || [],
      lastSyncedAt: new Date().toISOString(),
    });

    return setCorsHeaders(
      NextResponse.json({ success: true, timestamp: new Date().toISOString() })
    );
  } catch (error) {
    console.error("Sync Error:", error);
    return setCorsHeaders(
      NextResponse.json({ success: false, error: String(error) }, { status: 500 })
    );
  }
}
