import { NextResponse } from "next/server";
import { getPayments, createPayment } from "@/lib/adminDb";

export async function GET() {
  try {
    const list = await getPayments();
    return NextResponse.json({ success: true, payments: list });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { customerId, customerName, amountPaidPaise, mode, referenceNo, description } = await req.json();
    if (!customerId || !customerName || !amountPaidPaise || !mode) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }
    const record = await createPayment(customerId, customerName, parseInt(amountPaidPaise), mode, referenceNo, description);
    return NextResponse.json({ success: true, payment: record });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
