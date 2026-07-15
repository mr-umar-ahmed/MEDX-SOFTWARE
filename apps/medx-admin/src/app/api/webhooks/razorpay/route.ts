import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { extendLicense, createPayment, loadLicense } from "@/lib/adminDb";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Verify Webhook Signature (if RAZORPAY_WEBHOOK_SECRET is configured)
    if (secret) {
      if (!signature) {
        return NextResponse.json({ success: false, error: "Missing signature" }, { status: 400 });
      }
      const shasum = createHmac("sha256", secret);
      shasum.update(rawBody);
      const digest = shasum.digest("hex");
      if (digest !== signature) {
        return NextResponse.json({ success: false, error: "Signature mismatch" }, { status: 400 });
      }
    }

    const body = JSON.parse(rawBody);
    const event = body.event;

    // We respond to 'payment.captured' or 'order.paid'
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = body.payload.payment.entity;
      const amount = paymentEntity.amount; // Razorpay sends amount in paise integer (perfect for our paise rule!)
      const paymentId = paymentEntity.id;
      const notes = paymentEntity.notes || {};

      const licenseKey = notes.licenseKey;
      const days = parseInt(notes.days || "30");

      if (licenseKey) {
        // Load the license to get the customer details
        const license = await loadLicense(licenseKey);
        if (license) {
          // Extend license validity in DB
          await extendLicense(licenseKey, days);

          // Add a payment ledger entry
          await createPayment(
            license.id,
            license.labName,
            amount,
            "Card", // fallback to Card/UPI or read from payment method
            paymentId,
            `Automated renewal extension for ${days} days via payment webhook.`
          );

          console.log(`✓ Webhook: Extended license ${licenseKey} by ${days} days.`);
        } else {
          console.warn(`⚠️ Webhook: License key ${licenseKey} not found for extension.`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
