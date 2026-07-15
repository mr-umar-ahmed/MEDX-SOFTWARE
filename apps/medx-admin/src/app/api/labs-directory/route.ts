import { NextResponse } from "next/server";
import { getLicenses } from "@/lib/adminDb";

/**
 * Public, sanitized directory of licensed labs. Consumed by the medx-web
 * patient site (lab listing / booking) and by the sync endpoint to validate
 * license keys. Never exposes license tokens or device fingerprints.
 */

function setCorsHeaders(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  try {
    const list = await getLicenses();
    const now = new Date();
    const labs = list.map((l) => ({
      id: l.id,
      labName: l.labName,
      contactPhone: l.contactPhone,
      tier: l.tier,
      status: l.status === "active" && new Date(l.validUntil) > now ? "active" : "inactive",
    }));
    return setCorsHeaders(NextResponse.json({ success: true, labs }));
  } catch (err) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: String(err) }, { status: 500 })
    );
  }
}
