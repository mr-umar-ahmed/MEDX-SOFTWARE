import { useState } from "react";
import { useStore, monthKey } from "../data/store";
import { formatINR, paiseToRupees, rupeesToPaise } from "../core/money";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, downloadCSV } from "../ui/bits";

export default function CommissionPage() {
  const store = useStore();
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));

  // Compute commission per doctor for the selected month
  const doctorSummaries = store.doctors.filter((d) => d.commissionPct != null && d.commissionPct > 0).map((d) => {
    const ordersThisMonth = store.orders.filter((o) => o.doctorId === d.id && monthKey(o.createdAt) === selectedMonth);
    const totalRevenue = ordersThisMonth.reduce((s, o) => s + o.grandTotalPaise, 0);
    const commissionPaise = Math.round(totalRevenue * (d.commissionPct ?? 0) / 100);
    const paidPaise = store.commissionPayouts
      .filter((p) => p.doctorId === d.id && p.monthKey === selectedMonth)
      .reduce((s, p) => s + p.amountPaise, 0);
    return { doctor: d, ordersCount: ordersThisMonth.length, totalRevenue, commissionPaise, paidPaise, duePaise: Math.max(0, commissionPaise - paidPaise) };
  });

  const totalCommission = doctorSummaries.reduce((s, d) => s + d.commissionPaise, 0);
  const totalDue = doctorSummaries.reduce((s, d) => s + d.duePaise, 0);

  function payDoctor(doctorId: string, amountPaise: number) {
    if (amountPaise <= 0) return;
    store.addCommissionPayout(doctorId, selectedMonth, amountPaise);
  }

  function exportCSV() {
    const header = ["Doctor", "Clinic", "Commission %", "Orders", "Revenue (₹)", "Commission (₹)", "Paid (₹)", "Due (₹)"];
    const rows = doctorSummaries.map((d) => [
      d.doctor.name, d.doctor.clinic ?? "", d.doctor.commissionPct ?? 0, d.ordersCount,
      paiseToRupees(d.totalRevenue), paiseToRupees(d.commissionPaise), paiseToRupees(d.paidPaise), paiseToRupees(d.duePaise),
    ]);
    downloadCSV(`commission-${selectedMonth}.csv`, [header, ...rows]);
  }

  return (
    <Page title="Doctor Commission" sub="Monthly commission summary, payouts, and statements." actions={
      <button className="btn" onClick={exportCSV}>⬇ Export CSV</button>
    }>
      <div className="row" style={{ marginBottom: 16, alignItems: "center" }}>
        <Field label="Month">
          <input className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        </Field>
        <div className="card card-pad stat" style={{ marginLeft: "auto" }}>
          <div className="n mono" style={{ color: "var(--primary)" }}>{formatINR(totalCommission)}</div><div className="l">Total Commission</div>
        </div>
        <div className="card card-pad stat">
          <div className="n mono" style={{ color: "var(--danger)" }}>{formatINR(totalDue)}</div><div className="l">Unpaid</div>
        </div>
      </div>

      <Section title="Commission Summary" pad={false}>
        {doctorSummaries.length === 0 ? <Empty>No doctors with commission configured. Set commission % in the Doctor List.</Empty> : (
          <table>
            <thead><tr><th>Doctor</th><th>Commission %</th><th>Orders</th><th className="right">Revenue</th><th className="right">Commission</th><th className="right">Paid</th><th className="right">Due</th><th></th></tr></thead>
            <tbody>
              {doctorSummaries.map((d) => (
                <tr key={d.doctor.id}>
                  <td><b>{d.doctor.name}</b><div className="muted" style={{ fontSize: 12 }}>{d.doctor.clinic}</div></td>
                  <td className="mono">{d.doctor.commissionPct}%</td>
                  <td>{d.ordersCount}</td>
                  <td className="right mono">{formatINR(d.totalRevenue)}</td>
                  <td className="right mono">{formatINR(d.commissionPaise)}</td>
                  <td className="right mono" style={{ color: "var(--ok)" }}>{formatINR(d.paidPaise)}</td>
                  <td className="right mono" style={{ color: d.duePaise > 0 ? "var(--danger)" : "var(--text-dim)", fontWeight: 700 }}>{d.duePaise > 0 ? formatINR(d.duePaise) : "—"}</td>
                  <td>
                    {d.duePaise > 0 && (
                      <button className="btn" onClick={() => payDoctor(d.doctor.id, d.duePaise)}>Pay {formatINR(d.duePaise)}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </Page>
  );
}
