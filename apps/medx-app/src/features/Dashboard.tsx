import { Link } from "react-router-dom";
import { useStore, orderDuePaise } from "../data/store";
import { formatINR } from "../core/money";
import { fmtDateTime, ageString } from "../lib/format";
import { TOTAL_CATALOG_SIZE } from "../catalog";

function isToday(iso: string) {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export default function Dashboard() {
  const { orders, patients, getPatient } = useStore();
  const today = orders.filter((o) => isToday(o.createdAt));
  const todayRevenue = today.reduce((s, o) => s + o.grandTotalPaise, 0);
  const totalDue = orders.reduce((s, o) => s + orderDuePaise(o), 0);
  const pending = orders.filter((o) => o.status !== "reported" && o.status !== "delivered").length;

  return (
    <>
      <div className="topbar no-print">
        <div>
          <h1>Dashboard</h1>
          <div className="muted" style={{ fontSize: 13 }}>{fmtDateTime(new Date())}</div>
        </div>
        <Link to="/new" className="btn btn-primary btn-lg">＋ New Registration</Link>
      </div>
      <div className="content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { l: "Today's Patients", n: String(today.length), c: "var(--primary)", bg: "var(--primary-soft)", icon: "👥" },
            { l: "Today's Collection", n: formatINR(todayRevenue), c: "var(--ok)", bg: "var(--ok-soft)", icon: "🪙" },
            { l: "Pending Reports", n: String(pending), c: "var(--warn)", bg: "var(--warn-soft)", icon: "⏳" },
            { l: "Outstanding Dues", n: formatINR(totalDue), c: "var(--danger)", bg: "var(--danger-soft)", icon: "🚨" },
          ].map((s) => (
            <div key={s.l} className="card card-pad stat" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
              <div>
                <div className="n" style={{ color: s.c, fontSize: "28px", fontWeight: 800 }}>{s.n}</div>
                <div className="l" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)" }}>{s.l}</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: "10px", background: s.bg, display: "grid", placeItems: "center", fontSize: "22px", boxShadow: "0 2px 4px 0 rgba(0,0,0,0.02)" }}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="card col" style={{ overflow: "hidden" }}>
            <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>Recent Registrations</h2>
              <Link to="/worklist" className="btn btn-ghost">View all →</Link>
            </div>
            {orders.length === 0 ? (
              <div className="card-pad muted">No registrations yet. Click <b>New Registration</b> to bill your first patient.</div>
            ) : (
              <table>
                <thead><tr><th>Invoice</th><th>Patient</th><th>Tests</th><th className="right">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {orders.slice(0, 8).map((o) => {
                    const p = getPatient(o.patientId);
                    return (
                      <tr key={o.id}>
                        <td><Link to={`/order/${o.id}`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{o.invoiceNo}</Link><div className="muted" style={{ fontSize: 12 }}>{o.accessionNo}</div></td>
                        <td>{p?.name}<div className="muted" style={{ fontSize: 12 }}>{p && `${ageString(p)} · ${p.sex}`}</div></td>
                        <td>{o.items.length}</td>
                        <td className="right mono">{formatINR(o.grandTotalPaise)}</td>
                        <td><StatusBadge status={o.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="card card-pad" style={{ width: 300 }}>
            <h3>Lab at a glance</h3>
            <Stat label="Registered patients" value={String(patients.length)} />
            <Stat label="Tests in catalog" value={TOTAL_CATALOG_SIZE.toLocaleString("en-IN")} />
            <Stat label="Total registrations" value={String(orders.length)} />
            <div style={{ marginTop: 14, padding: 12, background: "var(--primary-soft)", borderRadius: 8, fontSize: 13 }}>
              <b>💡 Tip:</b> All data is stored on this PC and works fully offline. Set up scheduled backups in Settings.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="muted">{label}</span><b className="mono">{value}</b>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    registered: "badge-muted", collected: "badge-info", "in-process": "badge-warn",
    reported: "badge-ok", delivered: "badge-ok",
  };
  return <span className={`badge ${map[status] ?? "badge-muted"}`}>{status}</span>;
}
