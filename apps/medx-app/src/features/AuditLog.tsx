import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDateTime } from "../lib/format";
import { Page, Empty, downloadCSV } from "../ui/bits";

export default function AuditLog() {
  const store = useStore();
  const [q, setQ] = useState("");

  const filtered = store.audit.filter((a) => {
    if (!q.trim()) return true;
    return `${a.action} ${a.detail} ${a.user}`.toLowerCase().includes(q.toLowerCase());
  });

  function exportAudit() {
    const header = ["Timestamp", "User", "Action", "Detail"];
    const rows = filtered.map((a) => [a.at, a.user, a.action, a.detail]);
    downloadCSV("medx-audit-log.csv", [header, ...rows]);
  }

  return (
    <Page title="Audit Trail" sub="Who did what, and when — complete activity log." actions={
      <button className="btn" onClick={exportAudit}>⬇ Export CSV</button>
    }>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <input className="input" style={{ maxWidth: 340 }} placeholder="🔍 Filter by action, user, detail…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="muted" style={{ marginLeft: "auto" }}>{filtered.length} entries</div>
        </div>
        {filtered.length === 0 ? <Empty>No audit log entries.</Empty> : (
          <table>
            <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>
              {filtered.slice(0, 100).map((a) => (
                <tr key={a.id}>
                  <td className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{fmtDateTime(a.at)}</td>
                  <td><b>{a.user}</b></td>
                  <td><span className="badge badge-info">{a.action}</span></td>
                  <td>{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  );
}
