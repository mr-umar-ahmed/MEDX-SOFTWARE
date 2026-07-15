import { NextResponse } from "next/server";
import { getVendorAuditLogs } from "@/lib/adminDb";

export async function GET() {
  try {
    const logs = await getVendorAuditLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
