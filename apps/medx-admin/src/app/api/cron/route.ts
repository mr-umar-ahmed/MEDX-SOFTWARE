import { NextResponse } from "next/server";
import { getLicenses, setLicenseMessage, revokeLicense } from "@/lib/adminDb";

export async function GET(req: Request) {
  try {
    // 1. Verify Vercel Cron Signature (if CRON_SECRET is configured)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Allow either the cron secret or admin password (for manual trigger/testing)
    if (cronSecret || adminPassword) {
      const isValidCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
      const isValidAdmin = adminPassword && authHeader === `Bearer ${adminPassword}`;
      if (!isValidCron && !isValidAdmin) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const licenses = await getLicenses();
    const now = Date.now();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    
    const results = {
      totalProcessed: licenses.length,
      expiringWarningsSent: 0,
      gracePeriodAlertsSent: 0,
      autoRevoked: [] as string[],
    };

    for (const license of licenses) {
      if (license.status === "revoked") continue;

      const validUntilTime = new Date(license.validUntil).getTime();
      const diffMs = validUntilTime - now;
      const remainingDays = diffMs / MS_PER_DAY;

      if (remainingDays <= -7) {
        // Expired past the 7-day grace period -> auto-revoke!
        await revokeLicense(license.id);
        // Explicitly set the lockout warning message
        await setLicenseMessage(license.id, "Your license has expired and has been deactivated. Please renew to regain access.");
        results.autoRevoked.push(license.id);
      } else if (remainingDays <= 0) {
        // Expired but within the 7-day grace period
        const graceRemaining = Math.ceil(7 + remainingDays);
        await setLicenseMessage(
          license.id,
          `CRITICAL: Your subscription expired. You are in a grace period. Client database will lock in ${graceRemaining} days.`
        );
        results.gracePeriodAlertsSent++;
      } else if (remainingDays <= 15) {
        // Expiring in 15 days or less
        const daysRemaining = Math.ceil(remainingDays);
        await setLicenseMessage(
          license.id,
          `WARNING: Your MedX subscription expires in ${daysRemaining} days. Please renew to prevent service lockout.`
        );
        results.expiringWarningsSent++;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
