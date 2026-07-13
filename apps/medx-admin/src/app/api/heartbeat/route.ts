import { NextResponse } from "next/server";
import { getLicenses, registerHeartbeat } from "@/lib/adminDb";

export async function POST(req: Request) {
  try {
    const { licenseKey } = await req.json();
    if (!licenseKey) {
      return NextResponse.json({ success: false, error: "Missing licenseKey" }, { status: 400 });
    }

    const list = await getLicenses();
    const record = list.find((l) => l.id === licenseKey);

    if (!record || record.status === "revoked") {
      return NextResponse.json({ success: true, active: false, error: "License revoked or invalid" });
    }

    // Register heartbeat timestamp
    await registerHeartbeat(licenseKey);

    return NextResponse.json({
      success: true,
      active: true,
      validUntil: record.validUntil,
      tier: record.tier,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
