import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, createSessionToken } from "@/lib/adminAuth";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function POST(req: Request) {
  try {
    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "Admin panel is not configured (ADMIN_PASSWORD env var missing)." },
        { status: 503 }
      );
    }

    const { password } = await req.json();
    const ok = await checkPassword(String(password ?? ""));
    if (!ok) {
      return NextResponse.json({ success: false, error: "Incorrect password." }, { status: 401 });
    }

    const token = await createSessionToken(SESSION_TTL_SECONDS * 1000);
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });
    return res;
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}
