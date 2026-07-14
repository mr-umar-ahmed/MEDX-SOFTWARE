import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "cloud-db.json");

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { licenseKey, labSettings, catalog, data } = payload;
    
    if (!licenseKey || !labSettings) {
      return NextResponse.json({ success: false, error: "Missing license key or lab settings" }, { status: 400 });
    }

    // Read existing database structure
    let db: { labs: Record<string, any> } = { labs: {} };
    if (fs.existsSync(DB_PATH)) {
      try {
        db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
        if (!db.labs) db.labs = {};
      } catch (e) {
        db = { labs: {} };
      }
    }

    // Update the partition for this specific lab
    db.labs[licenseKey] = {
      licenseKey,
      settings: labSettings,
      catalog: catalog || [],
      orders: data?.orders || [],
      patients: data?.patients || [],
      lastSyncedAt: new Date().toISOString()
    };

    // Save back to JSON store
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
