import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore, orderDuePaise } from "../data/store";
import { formatINR } from "../core/money";
import { fmtDate } from "../lib/format";
import { Page, Empty } from "../ui/bits";
import { StatusBadge } from "./Dashboard";

export default function Invoices() {
  const { orders, getPatient } = useStore();
  const [q, setQ] = useState("");

  const filtered = orders.filter((o) => {
    if (!q.trim()) return true;
    const p = getPatient(o.patientId);
    return `${o.invoiceNo} ${o.accessionNo} ${p?.name ?? ""} ${p?.phone ?? ""}`.toLowerCase().includes(q.toLowerCase());
  });

  const totalRevenue = filtered.reduce((s, o) => s + o.grandTotalPaise, 0);

  return (
    <Page title="Invoices" sub="All GST invoices generated — search, filter, and reprint.">
      <div className="grid-4" style={{ marginBottom: 18 }}>
        <div className="card card-pad stat"><div className="n" style={{ color: "var(--primary)" }}>{filtered.length}</div><div className="l">Invoices</div></div>
        <div className="card card-pad stat"><div className="n" style={{ color: "var(--ok)" }}>{formatINR(totalRevenue)}</div><div className="l">Total Revenue</div></div>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <input className="input" style={{ maxWidth: 340 }} placeholder="🔍 Search invoice, patient…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="muted" style={{ marginLeft: "auto" }}>{filtered.length} of {orders.length}</div>
        </div>
        {filtered.length === 0 ? <Empty>No invoices found.</Empty> : (
          <table>
            <thead><tr><th>Invoice #</th><th>Patient</th><th>Date</th><th>Tests</th><th className="right">Total</th><th className="right">Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((o) => {
                const p = getPatient(o.patientId);
                const due = orderDuePaise(o);
                return (
                  <tr key={o.id}>
                    <td><b>{o.invoiceNo}</b></td>
                    <td>{p?.name}<div className="muted" style={{ fontSize: 12 }}>{p?.phone}</div></td>
                    <td className="muted" style={{ fontSize: 13 }}>{fmtDate(o.createdAt)}</td>
                    <td>{o.items.length}</td>
                    <td className="right mono">{formatINR(o.grandTotalPaise)}</td>
                    <td className="right mono" style={{ color: due > 0 ? "var(--danger)" : "var(--text-dim)" }}>{due > 0 ? formatINR(due) : "—"}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><Link to={`/order/${o.id}`} className="btn">View →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  );
}
