import { NextResponse } from "next/server";
import {
  getLicenses,
  createLicense,
  revokeLicense,
  reactivateLicense,
  extendLicense,
  setLicenseTier,
  removeLicenseDevice,
  setLicenseMessage,
} from "@/lib/adminDb";

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
    const body = await req.json();
    const { id, action } = body;
    if (!id) {
      const res = NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
      return setCorsHeaders(res);
    }

    switch (action ?? "revoke") {
      case "revoke":
        await revokeLicense(id);
        return setCorsHeaders(NextResponse.json({ success: true }));

      case "reactivate":
        await reactivateLicense(id);
        return setCorsHeaders(NextResponse.json({ success: true }));

      case "extend": {
        const days = parseInt(body.days);
        if (!days || days < 1) {
          return setCorsHeaders(
            NextResponse.json({ success: false, error: "days must be a positive number" }, { status: 400 })
          );
        }
        const record = await extendLicense(id, days);
        if (!record) {
          return setCorsHeaders(
            NextResponse.json({ success: false, error: "License not found" }, { status: 404 })
          );
        }
        return setCorsHeaders(NextResponse.json({ success: true, license: record }));
      }

      case "setTier": {
        const tier = body.tier;
        if (!["Starter", "Pro", "Enterprise"].includes(tier)) {
          return setCorsHeaders(
            NextResponse.json({ success: false, error: "Invalid tier" }, { status: 400 })
          );
        }
        const record = await setLicenseTier(id, tier);
        if (!record) {
          return setCorsHeaders(
            NextResponse.json({ success: false, error: "License not found" }, { status: 404 })
          );
        }
        return setCorsHeaders(NextResponse.json({ success: true, license: record }));
      }

      case "removeDevice": {
        if (!body.deviceId) {
          return setCorsHeaders(
            NextResponse.json({ success: false, error: "Missing deviceId" }, { status: 400 })
          );
        }
        const removed = await removeLicenseDevice(id, body.deviceId);
        return setCorsHeaders(NextResponse.json({ success: true, removed }));
      }

      case "setMessage":
        await setLicenseMessage(id, String(body.message ?? ""));
        return setCorsHeaders(NextResponse.json({ success: true }));

      default:
        return setCorsHeaders(
          NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
        );
    }
  } catch (err) {
    const res = NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    return setCorsHeaders(res);
  }
}
