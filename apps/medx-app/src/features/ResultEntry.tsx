import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { fmtDateTime, ageString } from "../lib/format";
import { Page, Empty } from "../ui/bits";
import { StatusBadge } from "./Dashboard";

export default function ResultEntry() {
  const { orders, getPatient } = useStore();
  const [q, setQ] = useState("");

  // Orders where at least one result value is empty and not yet verified
  const pending = orders.filter((o) =>
    o.status !== "reported" && o.status !== "delivered" &&
    o.items.some((it) => !it.verified && it.results.some((r) => r.value === ""))
  );

  const filtered = pending.filter((o) => {
    if (!q.trim()) return true;
    const p = useStore.getState().getPatient(o.patientId);
    const hay = `${o.invoiceNo} ${o.accessionNo} ${p?.name ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <Page title="Result Entry" sub="Orders awaiting result entry — click to enter values.">
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <input className="input" style={{ maxWidth: 340 }} placeholder="🔍 Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="muted" style={{ marginLeft: "auto" }}>{filtered.length} pending</div>
        </div>
        {filtered.length === 0 ? <Empty>All results entered! 🎉</Empty> : (
          <table>
            <thead><tr><th>Invoice / Acc</th><th>Patient</th><th>Tests</th><th>Results Done</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((o) => {
                const p = getPatient(o.patientId);
                const totalAnalytes = o.items.reduce((s, it) => s + it.results.length, 0);
                const doneAnalytes = o.items.reduce((s, it) => s + it.results.filter((r) => r.value !== "").length, 0);
                return (
                  <tr key={o.id}>
                    <td><b>{o.invoiceNo}</b><div className="muted" style={{ fontSize: 12 }}>{o.accessionNo}</div></td>
                    <td>{p?.name}<div className="muted" style={{ fontSize: 12 }}>{p && `${ageString(p)} · ${p.sex}`}</div></td>
                    <td>{o.items.length}</td>
                    <td><span className={doneAnalytes === 0 ? "muted" : doneAnalytes < totalAnalytes ? "" : "badge badge-ok"}>{doneAnalytes}/{totalAnalytes}</span></td>
                    <td className="muted" style={{ fontSize: 13 }}>{fmtDateTime(o.createdAt)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><Link to={`/order/${o.id}?tab=results`} className="btn btn-primary">Enter Results →</Link></td>
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
