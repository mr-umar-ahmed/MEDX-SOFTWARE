import { useState } from "react";
import { useStore, orderDuePaise, monthKey } from "../data/store";
import { formatINR, paiseToRupees } from "../core/money";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, downloadCSV } from "../ui/bits";

type ReportType = "revenue-test" | "revenue-doctor" | "daybook" | "collection";

export default function MisReports() {
  const store = useStore();
  const [reportType, setReportType] = useState<ReportType>("daybook");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const ordersInRange = store.orders.filter((o) => {
    const d = o.createdAt.slice(0, 10);
    return d >= fromDate && d <= toDate;
  });

  function exportReport() {
    if (reportType === "daybook") {
      const header = ["Date", "Invoice", "Patient", "Tests", "Total (₹)", "Paid (₹)", "Due (₹)"];
      const rows = ordersInRange.map((o) => {
        const p = store.getPatient(o.patientId);
        const due = orderDuePaise(o);
        return [fmtDate(o.createdAt), o.invoiceNo, p?.name ?? "", o.items.length, paiseToRupees(o.grandTotalPaise), paiseToRupees(o.grandTotalPaise - due), paiseToRupees(due)];
      });
      downloadCSV(`daybook-${fromDate}-to-${toDate}.csv`, [header, ...rows]);
    } else if (reportType === "revenue-test") {
      const map: Record<string, { count: number; rev: number }> = {};
      ordersInRange.forEach((o) => o.items.forEach((it) => {
        const e = map[it.testName] ?? { count: 0, rev: 0 };
        e.count++; e.rev += it.pricePaise - it.discountPaise;
        map[it.testName] = e;
      }));
      const header = ["Test", "Count", "Revenue (₹)"];
      const rows = Object.entries(map).sort((a, b) => b[1].rev - a[1].rev).map(([name, d]) => [name, d.count, paiseToRupees(d.rev)]);
      downloadCSV(`revenue-by-test-${fromDate}-to-${toDate}.csv`, [header, ...rows]);
    } else if (reportType === "revenue-doctor") {
      const map: Record<string, { count: number; rev: number }> = {};
      ordersInRange.forEach((o) => {
        const dName = store.getDoctor(o.doctorId)?.name ?? "Self / Walk-in";
        const e = map[dName] ?? { count: 0, rev: 0 };
        e.count++; e.rev += o.grandTotalPaise;
        map[dName] = e;
      });
      const header = ["Doctor", "Referrals", "Revenue (₹)"];
      const rows = Object.entries(map).sort((a, b) => b[1].rev - a[1].rev).map(([name, d]) => [name, d.count, paiseToRupees(d.rev)]);
      downloadCSV(`revenue-by-doctor-${fromDate}-to-${toDate}.csv`, [header, ...rows]);
    } else if (reportType === "collection") {
      const map: Record<string, number> = {};
      ordersInRange.forEach((o) => o.payments.forEach((p) => {
        map[p.mode] = (map[p.mode] ?? 0) + p.amountPaise;
      }));
      const header = ["Payment Mode", "Amount (₹)"];
      const rows = Object.entries(map).map(([mode, amt]) => [mode, paiseToRupees(amt)]);
      downloadCSV(`collection-${fromDate}-to-${toDate}.csv`, [header, ...rows]);
    }
  }

  // Display data inline
  const totalRevenue = ordersInRange.reduce((s, o) => s + o.grandTotalPaise, 0);
  const totalDue = ordersInRange.reduce((s, o) => s + orderDuePaise(o), 0);

  return (
    <Page title="MIS Reports" sub="Generate downloadable management reports.">
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="grid-4" style={{ alignItems: "flex-end" }}>
          <Field label="Report">
            <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
              <option value="daybook">Day Book / Collection Register</option>
              <option value="revenue-test">Revenue by Test</option>
              <option value="revenue-doctor">Revenue by Doctor</option>
              <option value="collection">Collection Summary (Cash/UPI/Card)</option>
            </select>
          </Field>
          <Field label="From"><input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
          <Field label="To"><input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
          <Field label="&nbsp;"><button className="btn btn-primary" onClick={exportReport}>⬇ Download CSV</button></Field>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="card card-pad stat"><div className="n" style={{ color: "var(--primary)" }}>{ordersInRange.length}</div><div className="l">Registrations</div></div>
        <div className="card card-pad stat"><div className="n" style={{ color: "var(--ok)" }}>{formatINR(totalRevenue)}</div><div className="l">Total Billed</div></div>
        <div className="card card-pad stat"><div className="n" style={{ color: "var(--ok)" }}>{formatINR(totalRevenue - totalDue)}</div><div className="l">Collected</div></div>
        <div className="card card-pad stat"><div className="n" style={{ color: "var(--danger)" }}>{formatINR(totalDue)}</div><div className="l">Dues</div></div>
      </div>

      {reportType === "daybook" && (
        <Section title="Day Book" pad={false}>
          <table>
            <thead><tr><th>Date</th><th>Invoice</th><th>Patient</th><th>Tests</th><th className="right">Total</th><th className="right">Due</th></tr></thead>
            <tbody>
              {ordersInRange.slice(0, 50).map((o) => {
                const p = store.getPatient(o.patientId);
                const due = orderDuePaise(o);
                return (
                  <tr key={o.id}>
                    <td className="muted">{fmtDate(o.createdAt)}</td>
                    <td><b>{o.invoiceNo}</b></td>
                    <td>{p?.name}</td>
                    <td>{o.items.length}</td>
                    <td className="right mono">{formatINR(o.grandTotalPaise)}</td>
                    <td className="right mono" style={{ color: due > 0 ? "var(--danger)" : "var(--text-dim)" }}>{due > 0 ? formatINR(due) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {reportType === "revenue-test" && (
        <Section title="Revenue by Test" pad={false}>
          <table>
            <thead><tr><th>Test</th><th>Count</th><th className="right">Revenue</th></tr></thead>
            <tbody>
              {(() => {
                const map: Record<string, { count: number; rev: number }> = {};
                ordersInRange.forEach((o) => o.items.forEach((it) => {
                  const e = map[it.testName] ?? { count: 0, rev: 0 };
                  e.count++; e.rev += it.pricePaise - it.discountPaise;
                  map[it.testName] = e;
                }));
                return Object.entries(map).sort((a, b) => b[1].rev - a[1].rev).slice(0, 30).map(([name, d]) => (
                  <tr key={name}><td><b>{name}</b></td><td>{d.count}</td><td className="right mono">{formatINR(d.rev)}</td></tr>
                ));
              })()}
            </tbody>
          </table>
        </Section>
      )}

      {reportType === "revenue-doctor" && (
        <Section title="Revenue by Doctor" pad={false}>
          <table>
            <thead><tr><th>Doctor</th><th>Referrals</th><th className="right">Revenue</th></tr></thead>
            <tbody>
              {(() => {
                const map: Record<string, { count: number; rev: number }> = {};
                ordersInRange.forEach((o) => {
                  const dName = store.getDoctor(o.doctorId)?.name ?? "Self / Walk-in";
                  const e = map[dName] ?? { count: 0, rev: 0 };
                  e.count++; e.rev += o.grandTotalPaise;
                  map[dName] = e;
                });
                return Object.entries(map).sort((a, b) => b[1].rev - a[1].rev).map(([name, d]) => (
                  <tr key={name}><td><b>{name}</b></td><td>{d.count}</td><td className="right mono">{formatINR(d.rev)}</td></tr>
                ));
              })()}
            </tbody>
          </table>
        </Section>
      )}

      {reportType === "collection" && (
        <Section title="Collection by Payment Mode" pad={false}>
          <table>
            <thead><tr><th>Mode</th><th className="right">Amount</th></tr></thead>
            <tbody>
              {(() => {
                const map: Record<string, number> = {};
                ordersInRange.forEach((o) => o.payments.forEach((p) => { map[p.mode] = (map[p.mode] ?? 0) + p.amountPaise; }));
                return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([mode, amt]) => (
                  <tr key={mode}><td><b>{mode}</b></td><td className="right mono">{formatINR(amt)}</td></tr>
                ));
              })()}
            </tbody>
          </table>
        </Section>
      )}
    </Page>
  );
}
