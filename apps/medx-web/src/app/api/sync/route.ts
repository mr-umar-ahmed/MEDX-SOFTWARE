import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BUCKET_URL = "https://kvdb.io/cae41247-25e4-414b-b0fa-bf1b49651a2c";

function getLocalDbPath() {
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV;
  const dir = isVercel ? "/tmp" : process.cwd();
  return path.join(dir, "cloud-db.json");
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { licenseKey, labSettings, catalog, data } = payload;
    
    if (!licenseKey || !labSettings) {
      return NextResponse.json({ success: false, error: "Missing license key or lab settings" }, { status: 400 });
    }

    // 1. Read existing from KV store (with local filesystem fallback)
    let db: { labs: Record<string, any> } = { labs: {} };
    const localPath = getLocalDbPath();

    try {
      const res = await fetch(`${BUCKET_URL}/cloud_db`, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        const text = await res.text();
        db = JSON.parse(text);
        try {
          fs.writeFileSync(localPath, text, "utf-8");
        } catch (e) {}
      }
    } catch (e) {
      console.error("KVDB Fetch failed for cloud_db, attempting local fallback:", e);
      if (fs.existsSync(localPath)) {
        try {
          db = JSON.parse(fs.readFileSync(localPath, "utf-8"));
        } catch (err) {}
      }
    }

    if (!db.labs) db.labs = {};

    // 2. Update the partition for this specific lab
    db.labs[licenseKey] = {
      licenseKey,
      settings: labSettings,
      catalog: catalog || [],
      orders: data?.orders || [],
      patients: data?.patients || [],
      lastSyncedAt: new Date().toISOString()
    };

    // 3. Write locally
    const text = JSON.stringify(db, null, 2);
    try {
      fs.writeFileSync(localPath, text, "utf-8");
    } catch (e) {}

    // 4. Push to KV store
    try {
      await fetch(`${BUCKET_URL}/cloud_db`, {
        method: "PUT",
        body: text,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("KVDB Write failed for cloud_db:", err);
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
