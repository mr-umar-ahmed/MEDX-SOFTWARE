import { NextResponse } from "next/server";
import { getLicenses, createLicense, revokeLicense } from "@/lib/adminDb";

export async function GET() {
  try {
    const list = await getLicenses();
    return NextResponse.json({ success: true, licenses: list });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { labName, contactPhone, tier, validDays } = await req.json();
    if (!labName || !contactPhone || !tier || !validDays) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }
    const record = await createLicense(labName, contactPhone, tier, parseInt(validDays));
    return NextResponse.json({ success: true, license: record });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }
    await revokeLicense(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
