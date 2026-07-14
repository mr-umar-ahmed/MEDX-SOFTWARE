import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { fmtDateTime, ageString } from "../lib/format";
import { Page, Empty } from "../ui/bits";
import { StatusBadge } from "./Dashboard";
import { generateReportPdf } from "../core/pdfReport";

export default function ReportList() {
  const store = useStore();
  const { orders, getPatient, getDoctor, settings } = store;
  const [q, setQ] = useState("");

  const reported = orders.filter((o) => o.status === "reported" || o.status === "delivered");
  const filtered = reported.filter((o) => {
    if (!q.trim()) return true;
    const p = getPatient(o.patientId);
    return `${o.invoiceNo} ${o.accessionNo} ${p?.name ?? ""}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <Page title="Report List" sub="All verified reports — print, share via WhatsApp, or export.">
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <input className="input" style={{ maxWidth: 340 }} placeholder="🔍 Search reports…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="muted" style={{ marginLeft: "auto" }}>{filtered.length} reports</div>
        </div>
        {filtered.length === 0 ? <Empty>No verified reports yet.</Empty> : (
          <table>
            <thead><tr><th>Invoice / Acc</th><th>Patient</th><th>Tests</th><th>Verified By</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((o) => {
                const p = getPatient(o.patientId);
                const d = getDoctor(o.doctorId);
                return (
                  <tr key={o.id}>
                    <td><b>{o.invoiceNo}</b><div className="muted" style={{ fontSize: 12 }}>{o.accessionNo}</div></td>
                    <td>{p?.name}<div className="muted" style={{ fontSize: 12 }}>{p && `${ageString(p)} · ${p.sex}`}</div></td>
                    <td>{o.items.length}</td>
                    <td>{o.verifiedBy ?? "—"}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{o.verifiedAt ? fmtDateTime(o.verifiedAt) : fmtDateTime(o.createdAt)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>
                      <div className="row">
                        <button className="btn" title="Download PDF" onClick={() => p && generateReportPdf(o, p, d, settings)} style={{ padding: "4px 10px" }}>📄</button>
                        <Link to={`/order/${o.id}`} className="btn">View Report →</Link>
                      </div>
                    </td>
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

