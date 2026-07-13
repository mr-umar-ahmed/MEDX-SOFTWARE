import { NextResponse } from "next/server";
import { getGlobalConfig, saveGlobalConfig } from "@/lib/adminDb";

export async function GET() {
  try {
    const config = await getGlobalConfig();
    return NextResponse.json({ success: true, config });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const patch = await req.json();
    const config = await getGlobalConfig();
    const updated = { ...config, ...patch };
    await saveGlobalConfig(updated);
    return NextResponse.json({ success: true, config: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
