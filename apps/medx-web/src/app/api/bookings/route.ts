import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/cloudStore";
import { verifyBearerLicense } from "@/lib/licenseVerify";

/**
 * Online home-collection bookings.
 *
 * POST  — public: a patient submits a booking for a lab. Stored per lab as
 *         "bookings/<licenseKey>". Only active Pro/Enterprise labs accept
 *         online bookings (their desktop app is what pulls them down).
 * GET   — lab desktop app: returns pending bookings. Authenticated with the
 *         lab's signed license token (Authorization: Bearer <token>).
 * PATCH — lab desktop app: acknowledges imported booking ids so they are
 *         removed from the cloud (keeps patient data retention minimal).
 */

const ADMIN_URL = process.env.MEDX_ADMIN_URL || "https://medx-admin-lac.vercel.app";
const MAX_PENDING = 200;

export interface WebBooking {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  age?: string;
  address: string;
  date: string;
  timeSlot: string;
  tests?: string;
}

function setCorsHeaders(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, GET, PATCH, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

function bookingsKey(licenseKey: string): string {
  return `bookings/${licenseKey}`;
}

interface DirectoryLab {
  id: string;
  tier: "Starter" | "Pro" | "Enterprise";
  status: "active" | "inactive";
}

async function lookupLab(labId: string): Promise<DirectoryLab | null> {
  try {
    const res = await fetch(`${ADMIN_URL}/api/labs-directory`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !Array.isArray(data.labs)) return null;
    return data.labs.find((l: DirectoryLab) => l.id === labId) ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { labId, name, phone, age, address, date, timeSlot, tests } = body;

    if (!labId || !name || !phone || !address || !date || !timeSlot) {
      return setCorsHeaders(
        NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 })
      );
    }

    const lab = await lookupLab(String(labId));
    if (!lab || lab.status !== "active") {
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: "This laboratory is not accepting online bookings." },
          { status: 403 }
        )
      );
    }
    if (lab.tier === "Starter") {
      return setCorsHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "This laboratory does not offer online home-collection booking. Please call them directly.",
          },
          { status: 403 }
        )
      );
    }

    const booking: WebBooking = {
      id: "WB-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(),
      createdAt: new Date().toISOString(),
      name: String(name).slice(0, 120),
      phone: String(phone).slice(0, 20),
      age: age ? String(age).slice(0, 8) : undefined,
      address: String(address).slice(0, 500),
      date: String(date).slice(0, 10),
      timeSlot: String(timeSlot).slice(0, 40),
      tests: tests ? String(tests).slice(0, 300) : undefined,
    };

    const key = bookingsKey(String(labId));
    const pending = await readJson<WebBooking[]>(key, []);
    pending.push(booking);
    await writeJson(key, pending.slice(-MAX_PENDING));

    return setCorsHeaders(NextResponse.json({ success: true, bookingId: booking.id }));
  } catch (err) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: String(err) }, { status: 500 })
    );
  }
}

export async function GET(req: Request) {
  try {
    const license = await verifyBearerLicense(req);
    if (!license) {
      return setCorsHeaders(
        NextResponse.json({ success: false, error: "Invalid or missing license token." }, { status: 401 })
      );
    }

    const pending = await readJson<WebBooking[]>(bookingsKey(license.licenseKey), []);
    return setCorsHeaders(NextResponse.json({ success: true, bookings: pending }));
  } catch (err) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: String(err) }, { status: 500 })
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const license = await verifyBearerLicense(req);
    if (!license) {
      return setCorsHeaders(
        NextResponse.json({ success: false, error: "Invalid or missing license token." }, { status: 401 })
      );
    }

    const { ackIds } = await req.json();
    if (!Array.isArray(ackIds) || ackIds.length === 0) {
      return setCorsHeaders(
        NextResponse.json({ success: false, error: "ackIds must be a non-empty array." }, { status: 400 })
      );
    }

    const key = bookingsKey(license.licenseKey);
    const pending = await readJson<WebBooking[]>(key, []);
    const remaining = pending.filter((b) => !ackIds.includes(b.id));
    await writeJson(key, remaining);

    return setCorsHeaders(
      NextResponse.json({ success: true, removed: pending.length - remaining.length })
    );
  } catch (err) {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: String(err) }, { status: 500 })
    );
  }
}
