import { NextResponse } from "next/server";
import { readJson } from "@/lib/cloudStore";

/** Lightweight health check consumed by the admin panel's status page. */

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
  const startedAt = Date.now();
  let blobOk = false;
  try {
    // A read against the store (missing keys return the fallback without error)
    await readJson<Record<string, never>>("health-probe", {});
    blobOk = true;
  } catch {
    blobOk = false;
  }

  return setCorsHeaders(
    NextResponse.json({
      ok: blobOk,
      blob: blobOk,
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    })
  );
}
