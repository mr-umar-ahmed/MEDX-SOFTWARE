import { NextResponse } from "next/server";
import { registerHeartbeat } from "@/lib/adminDb";
import { verifyTokenSignature } from "@/lib/licenseVerify";

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

export async function POST(req: Request) {
  try {
    const { licenseKey, deviceId, hostname, currentToken } = await req.json();
    if (!licenseKey || !deviceId || !hostname) {
      const res = NextResponse.json({ success: false, error: "Missing licenseKey, deviceId or hostname" }, { status: 400 });
      return setCorsHeaders(res);
    }

    // Register heartbeat timestamp and check device connection limit
    const result = await registerHeartbeat(licenseKey, deviceId, hostname);

    if (!result.active || !result.record) {
      const res = NextResponse.json({
        success: true,
        active: false,
        code: result.code,
        error: result.error,
      });
      return setCorsHeaders(res);
    }

    const record = result.record;

    // Heartbeat doubles as the control channel:
    // - `token`: the current signed token, returned only when the caller
    //   proves it already holds a genuine token for this license (signature
    //   checked, expiry deliberately ignored so renewals reach expired
    //   installs). Renewals and tier changes propagate automatically.
    // - `adminMessage`: shown as a banner inside the lab's app.
    let refreshedToken: string | undefined;
    if (currentToken) {
      const proof = await verifyTokenSignature(String(currentToken));
      if (proof && proof.licenseKey === record.id && currentToken !== record.token) {
        refreshedToken = record.token;
      }
    }

    const res = NextResponse.json({
      success: true,
      active: true,
      validUntil: record.validUntil,
      tier: record.tier,
      ...(refreshedToken ? { token: refreshedToken } : {}),
      ...(record.adminMessage ? { adminMessage: record.adminMessage } : {}),
    });
    return setCorsHeaders(res);
  } catch (err) {
    const res = NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    return setCorsHeaders(res);
  }
}
