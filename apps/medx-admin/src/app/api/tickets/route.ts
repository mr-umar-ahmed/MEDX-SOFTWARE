import { NextResponse } from "next/server";
import { getTickets, createTicket, saveTickets } from "@/lib/adminDb";

export async function GET() {
  try {
    const list = await getTickets();
    return NextResponse.json({ success: true, tickets: list });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { customerId, customerName, subject, description, priority } = await req.json();
    if (!customerId || !customerName || !subject || !description || !priority) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }
    const record = await createTicket(customerId, customerName, subject, description, priority);
    return NextResponse.json({ success: true, ticket: record });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status, msgText, msgSender } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    const list = await getTickets();
    const index = list.findIndex((t) => t.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const ticket = list[index];
    if (status) {
      ticket.status = status;
    }
    if (msgText && msgSender) {
      ticket.messages.push({
        at: new Date().toISOString(),
        text: msgText,
        sender: msgSender,
      });
    }
    ticket.updatedAt = new Date().toISOString();

    list[index] = ticket;
    await saveTickets(list);

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
