import { useStore, orderDuePaise, monthKey } from "../data/store";
import { formatINR } from "../core/money";
import { Page } from "../ui/bits";

function isToday(iso: string) {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function isThisMonth(iso: string) {
  return monthKey(iso) === monthKey(new Date());
}

export default function Analytics360() {
  const { orders, patients, getDoctor } = useStore();

  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const monthOrders = orders.filter((o) => isThisMonth(o.createdAt));

  const todayRevenue = todayOrders.reduce((s, o) => s + o.grandTotalPaise, 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + o.grandTotalPaise, 0);
  const totalDue = orders.reduce((s, o) => s + orderDuePaise(o), 0);
  const todayTests = todayOrders.reduce((s, o) => s + o.items.length, 0);
  const monthTests = monthOrders.reduce((s, o) => s + o.items.length, 0);

  // Tests by category
  const catCounts: Record<string, number> = {};
  orders.forEach((o) => o.items.forEach((it) => { catCounts[it.category] = (catCounts[it.category] ?? 0) + 1; }));
  const topCategories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Top referring doctors
  const docCounts: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (o.doctorId) {
      const entry = docCounts[o.doctorId] ?? { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += o.grandTotalPaise;
      docCounts[o.doctorId] = entry;
    }
  });
  const topDocs = Object.entries(docCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  // Revenue by source
  const sourceCounts: Record<string, number> = {};
  orders.forEach((o) => { sourceCounts[o.source] = (sourceCounts[o.source] ?? 0) + o.grandTotalPaise; });

  // Pending stats
  const pendingReports = orders.filter((o) => o.status !== "reported" && o.status !== "delivered").length;

  return (
    <Page title="360° Analytics Dashboard" sub="Comprehensive lab performance overview.">
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { l: "Today's Revenue", n: formatINR(todayRevenue), c: "var(--ok)" },
          { l: "Month Revenue", n: formatINR(monthRevenue), c: "var(--primary)" },
          { l: "Total Outstanding", n: formatINR(totalDue), c: "var(--danger)" },
          { l: "Total Patients", n: String(patients.length), c: "var(--accent)" },
        ].map((s) => (
          <div key={s.l} className="card card-pad stat"><div className="n" style={{ color: s.c }}>{s.n}</div><div className="l">{s.l}</div></div>
        ))}
      </div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { l: "Today's Patients", n: String(todayOrders.length), c: "var(--primary)" },
          { l: "Today's Tests", n: String(todayTests), c: "var(--ok)" },
          { l: "Month Tests", n: String(monthTests), c: "var(--accent)" },
          { l: "Pending Reports", n: String(pendingReports), c: "var(--warn)" },
        ].map((s) => (
          <div key={s.l} className="card card-pad stat"><div className="n" style={{ color: s.c }}>{s.n}</div><div className="l">{s.l}</div></div>
        ))}
      </div>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="card card-pad col">
          <h3>Tests by Category</h3>
          {topCategories.length === 0 ? <div className="muted">No data yet.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topCategories.map(([cat, count]) => {
                const max = topCategories[0][1];
                return (
                  <div key={cat}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: 13 }}>
                      <span>{cat}</span><b className="mono">{count}</b>
                    </div>
                    <div style={{ background: "var(--border)", borderRadius: 4, height: 8 }}>
                      <div style={{ background: "var(--primary)", borderRadius: 4, height: 8, width: `${(count / max) * 100}%`, transition: "0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card card-pad col">
          <h3>Top Referring Doctors</h3>
          {topDocs.length === 0 ? <div className="muted">No referrals yet.</div> : (
            <table>
              <thead><tr><th>Doctor</th><th>Referrals</th><th className="right">Revenue</th></tr></thead>
              <tbody>
                {topDocs.map(([docId, data]) => {
                  const doc = getDoctor(docId);
                  return (
                    <tr key={docId}>
                      <td><b>{doc?.name ?? "Unknown"}</b></td>
                      <td>{data.count}</td>
                      <td className="right mono">{formatINR(data.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card card-pad" style={{ width: 280 }}>
          <h3>Revenue by Source</h3>
          {Object.keys(sourceCounts).length === 0 ? <div className="muted">No data.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([src, amt]) => (
                <div key={src} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span>{src}</span><b className="mono">{formatINR(amt)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
