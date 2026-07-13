import { NextResponse } from "next/server";
import { getLicenses, registerHeartbeat } from "@/lib/adminDb";

export async function POST(req: Request) {
  try {
    const { licenseKey, deviceId, hostname } = await req.json();
    if (!licenseKey || !deviceId || !hostname) {
      return NextResponse.json({ success: false, error: "Missing licenseKey, deviceId or hostname" }, { status: 400 });
    }

    const list = await getLicenses();
    const record = list.find((l) => l.id === licenseKey);

    if (!record) {
      return NextResponse.json({ success: true, active: false, error: "License key is invalid" });
    }

    // Register heartbeat timestamp and check device connection limit
    const result = await registerHeartbeat(licenseKey, deviceId, hostname);

    if (!result.active) {
      return NextResponse.json({ success: true, active: false, error: result.error });
    }

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
