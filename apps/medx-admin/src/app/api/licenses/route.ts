import { NextResponse } from "next/server";
import { getLicenses, createLicense, revokeLicense } from "@/lib/adminDb";

function setCorsHeaders(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PATCH, PUT");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return setCorsHeaders(res);
}

export async function GET() {
  try {
    const list = await getLicenses();
    const res = NextResponse.json({ success: true, licenses: list });
    return setCorsHeaders(res);
  } catch (err) {
    const res = NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    return setCorsHeaders(res);
  }
}

export async function POST(req: Request) {
  try {
    const { labName, contactPhone, tier, validDays } = await req.json();
    if (!labName || !contactPhone || !tier || !validDays) {
      const res = NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
      return setCorsHeaders(res);
    }
    const record = await createLicense(labName, contactPhone, tier, parseInt(validDays));
    const res = NextResponse.json({ success: true, license: record });
    return setCorsHeaders(res);
  } catch (err) {
    const res = NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    return setCorsHeaders(res);
  }
}

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      const res = NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
      return setCorsHeaders(res);
    }
    await revokeLicense(id);
    const res = NextResponse.json({ success: true });
    return setCorsHeaders(res);
  } catch (err) {
    const res = NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    return setCorsHeaders(res);
  }
}
