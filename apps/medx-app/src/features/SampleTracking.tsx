import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { fmtDateTime, ageString } from "../lib/format";
import { Page, Empty } from "../ui/bits";
import type { SampleStatus } from "../data/types";

const STATUS_COLORS: Record<SampleStatus, string> = {
  pending: "badge-muted",
  collected: "badge-info",
  received: "badge-warn",
  processed: "badge-ok",
};

export default function SampleTracking() {
  const { orders, getPatient, setSampleStatus } = useStore();
  const [filter, setFilter] = useState<"all" | "pending" | "collected" | "received">("all");
  const [q, setQ] = useState("");

  // Flatten: each order-item is a row
  const rows = orders.flatMap((o) =>
    o.items.map((it) => ({ order: o, item: it, patient: getPatient(o.patientId) }))
  );

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.item.sampleStatus !== filter) return false;
    if (q.trim()) {
      const hay = `${r.order.invoiceNo} ${r.order.accessionNo} ${r.patient?.name ?? ""} ${r.item.testName}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  function advance(orderId: string, testCode: string, current: SampleStatus) {
    const next: Record<SampleStatus, SampleStatus> = { pending: "collected", collected: "received", received: "processed", processed: "processed" };
    setSampleStatus(orderId, testCode, next[current]);
  }

  return (
    <Page title="Sample Tracking" sub="Track sample collection and processing status for each test.">
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <input className="input" style={{ maxWidth: 320 }} placeholder="🔍 Search patient, test, invoice…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="pill-toggle">
            {(["all", "pending", "collected", "received"] as const).map((f) => (
              <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          <div className="muted" style={{ marginLeft: "auto" }}>{filtered.length} samples</div>
        </div>
        {filtered.length === 0 ? <Empty>No matching samples.</Empty> : (
          <table>
            <thead><tr><th>Accession</th><th>Patient</th><th>Test</th><th>Sample Type</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.order.id}-${r.item.testCode}`}>
                  <td><Link to={`/order/${r.order.id}`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{r.order.accessionNo}</Link></td>
                  <td>{r.patient?.name}<div className="muted" style={{ fontSize: 12 }}>{r.patient && ageString(r.patient)}</div></td>
                  <td><b>{r.item.testName}</b></td>
                  <td className="muted">{r.item.sampleType}</td>
                  <td><span className={`badge ${STATUS_COLORS[r.item.sampleStatus]}`}>{r.item.sampleStatus}</span></td>
                  <td className="muted" style={{ fontSize: 13 }}>{fmtDateTime(r.order.createdAt)}</td>
                  <td>
                    {r.item.sampleStatus !== "processed" && (
                      <button className="btn" onClick={() => advance(r.order.id, r.item.testCode, r.item.sampleStatus)}>
                        {r.item.sampleStatus === "pending" ? "Mark Collected" : r.item.sampleStatus === "collected" ? "Mark Received" : "Mark Processed"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  );
}
