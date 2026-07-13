import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore, orderDuePaise, orderPaidPaise } from "../data/store";
import { formatINR, rupeesToPaise } from "../core/money";
import { fmtDateTime, ageString } from "../lib/format";
import { Page, Section, Field, Empty } from "../ui/bits";
import type { Payment } from "../data/types";

export default function PaymentsPage() {
  const store = useStore();
  const { orders, getPatient, addPayment } = store;

  // Payment form for an existing order
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<Payment["mode"]>("Cash");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  const searchResults = invoiceSearch.trim()
    ? orders.filter((o) => o.invoiceNo.toLowerCase().includes(invoiceSearch.toLowerCase()) || getPatient(o.patientId)?.name.toLowerCase().includes(invoiceSearch.toLowerCase())).slice(0, 5)
    : [];

  const selOrder = selectedOrder ? orders.find((o) => o.id === selectedOrder) : null;

  // All payments across all orders, sorted by date
  const allPayments = orders.flatMap((o) =>
    o.payments.map((p) => ({ ...p, orderId: o.id, invoiceNo: o.invoiceNo, patientId: o.patientId }))
  ).sort((a, b) => b.at.localeCompare(a.at));

  function collectPayment() {
    if (!selectedOrder || !payAmount) return;
    addPayment(selectedOrder, {
      amountPaise: rupeesToPaise(payAmount),
      mode: payMode,
      at: new Date().toISOString(),
      note: payNote.trim() || undefined,
    });
    setPayAmount(""); setPayNote(""); setSelectedOrder(null); setInvoiceSearch("");
  }

  return (
    <Page title="Payments" sub="Collect payments against existing invoices.">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="col">
          <Section title="Collect Payment">
            <Field label="Search Invoice or Patient">
              <input className="input" value={invoiceSearch} onChange={(e) => { setInvoiceSearch(e.target.value); setSelectedOrder(null); }} placeholder="🔍 Invoice number or patient name…" />
            </Field>
            {searchResults.length > 0 && !selectedOrder && (
              <div className="card" style={{ marginTop: 6 }}>
                {searchResults.map((o) => {
                  const p = getPatient(o.patientId);
                  const due = orderDuePaise(o);
                  return (
                    <div key={o.id} className="search-result" onClick={() => { setSelectedOrder(o.id); setInvoiceSearch(o.invoiceNo); }}>
                      <span><b>{o.invoiceNo}</b> · {p?.name} <span className="muted">· Due: {formatINR(due)}</span></span>
                      <span className="tag-sendout">select ↵</span>
                    </div>
                  );
                })}
              </div>
            )}
            {selOrder && (
              <div style={{ marginTop: 14, padding: 14, background: "var(--primary-soft)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><b>{selOrder.invoiceNo}</b> · {getPatient(selOrder.patientId)?.name}</div>
                  <div className="mono" style={{ fontWeight: 700 }}>Due: <span style={{ color: "var(--danger)" }}>{formatINR(orderDuePaise(selOrder))}</span></div>
                </div>
                <div className="grid-3" style={{ marginTop: 12 }}>
                  <Field label="Mode">
                    <select className="input" value={payMode} onChange={(e) => setPayMode(e.target.value as Payment["mode"])}>
                      {["Cash", "UPI", "Card"].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Amount (₹)">
                    <input className="input mono" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Note">
                    <input className="input" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Optional" />
                  </Field>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!payAmount} onClick={collectPayment}>💳 Collect Payment</button>
              </div>
            )}
          </Section>
        </div>
        <div className="col">
          <Section title={`Recent Payments (${allPayments.length})`} pad={false}>
            {allPayments.length === 0 ? <Empty>No payments recorded.</Empty> : (
              <table>
                <thead><tr><th>Invoice</th><th>Patient</th><th>Mode</th><th className="right">Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {allPayments.slice(0, 20).map((p, i) => {
                    const pat = getPatient(p.patientId);
                    return (
                      <tr key={i}>
                        <td><Link to={`/order/${p.orderId}`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{p.invoiceNo}</Link></td>
                        <td>{pat?.name}</td>
                        <td><span className="badge badge-info">{p.mode}</span></td>
                        <td className="right mono">{formatINR(p.amountPaise)}</td>
                        <td className="muted" style={{ fontSize: 13 }}>{fmtDateTime(p.at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      </div>
    </Page>
  );
}
