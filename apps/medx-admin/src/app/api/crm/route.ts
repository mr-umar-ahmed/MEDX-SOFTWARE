import { NextResponse } from "next/server";
import { getCustomers, createCustomer, saveCustomers } from "@/lib/adminDb";

export async function GET() {
  try {
    const list = await getCustomers();
    return NextResponse.json({ success: true, customers: list });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { labName, contactPhone, location, gstin } = await req.json();
    if (!labName || !contactPhone || !location) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }
    const record = await createCustomer(labName, contactPhone, location, gstin);
    return NextResponse.json({ success: true, customer: record });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, stage, noteText, noteAuthor } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    const list = await getCustomers();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const customer = list[index];
    if (stage) {
      customer.stage = stage;
    }
    if (noteText && noteAuthor) {
      customer.notes.push({
        at: new Date().toISOString(),
        text: noteText,
        author: noteAuthor,
      });
    }

    list[index] = customer;
    await saveCustomers(list);

    return NextResponse.json({ success: true, customer });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
