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
    const resolvedHostname = hostname || "unknown-pc";
    if (!licenseKey || !deviceId) {
      const res = NextResponse.json({ success: false, error: "Missing licenseKey or deviceId" }, { status: 400 });
      return setCorsHeaders(res);
    }

    // Register heartbeat timestamp and check device connection limit
    const result = await registerHeartbeat(licenseKey, deviceId, resolvedHostname);

    if (!result.active || !result.record) {
      let finalCode = result.code;
      let finalError = result.error;

      // If license not found in DB, check if the client holds a genuinely signed token.
      // If the token is validly signed, it must have been deleted by the admin.
      if (result.code === "unknown_key" && currentToken) {
        try {
          const proof = await verifyTokenSignature(String(currentToken));
          if (proof && proof.licenseKey === licenseKey) {
            finalCode = "revoked";
            finalError = "This license has been deactivated and deleted by the administrator.";
          }
        } catch (e) {
          console.error("Error verifying currentToken for deleted check:", e);
        }
      }

      const res = NextResponse.json({
        success: true,
        active: false,
        code: finalCode,
        error: finalError,
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
