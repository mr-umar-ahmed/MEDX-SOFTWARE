import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore, orderDuePaise } from "../data/store";
import { formatINR } from "../core/money";
import { fmtDateTime, ageString } from "../lib/format";
import { StatusBadge } from "./Dashboard";

export default function Worklist() {
  const { orders, getPatient } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "reported">("all");

  const filtered = orders.filter((o) => {
    if (filter === "pending" && (o.status === "reported" || o.status === "delivered")) return false;
    if (filter === "reported" && o.status !== "reported" && o.status !== "delivered") return false;
    if (!q.trim()) return true;
    const p = getPatient(o.patientId);
    const hay = `${o.invoiceNo} ${o.accessionNo} ${p?.name ?? ""} ${p?.phone ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <>
      <div className="topbar no-print">
        <h1>Worklist</h1>
        <Link to="/new" className="btn btn-primary">＋ New Registration</Link>
      </div>
      <div className="content">
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
            <input className="input" style={{ maxWidth: 340 }} placeholder="🔍 Search name, phone, invoice, accession…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="pill-toggle">
              <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>All</button>
              <button className={filter === "pending" ? "on" : ""} onClick={() => setFilter("pending")}>Pending</button>
              <button className={filter === "reported" ? "on" : ""} onClick={() => setFilter("reported")}>Reported</button>
            </div>
            <div className="muted" style={{ marginLeft: "auto" }}>{filtered.length} of {orders.length}</div>
          </div>
          {filtered.length === 0 ? (
            <div className="card-pad muted">No matching registrations.</div>
          ) : (
            <table>
              <thead><tr><th>Invoice / Acc</th><th>Patient</th><th>Date</th><th>Tests</th><th className="right">Total</th><th className="right">Due</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map((o) => {
                  const p = getPatient(o.patientId);
                  const due = orderDuePaise(o);
                  return (
                    <tr key={o.id}>
                      <td><b>{o.invoiceNo}</b><div className="muted" style={{ fontSize: 12 }}>{o.accessionNo}</div></td>
                      <td>{p?.name}<div className="muted" style={{ fontSize: 12 }}>{p && `${ageString(p)} · ${p.sex} · ${p.phone}`}</div></td>
                      <td className="muted" style={{ fontSize: 13 }}>{fmtDateTime(o.createdAt)}</td>
                      <td>{o.items.length}</td>
                      <td className="right mono">{formatINR(o.grandTotalPaise)}</td>
                      <td className="right mono" style={{ color: due > 0 ? "var(--danger)" : "var(--text-dim)" }}>{due > 0 ? formatINR(due) : "—"}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td><Link to={`/order/${o.id}`} className="btn">Open →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
