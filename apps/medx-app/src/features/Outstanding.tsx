import { Link } from "react-router-dom";
import { useStore, orderDuePaise } from "../data/store";
import { formatINR } from "../core/money";
import { fmtDate, ageString } from "../lib/format";
import { Page, Empty } from "../ui/bits";

export default function Outstanding() {
  const { orders, getPatient } = useStore();

  const withDues = orders
    .map((o) => ({ order: o, due: orderDuePaise(o) }))
    .filter((x) => x.due > 0);

  const totalDue = withDues.reduce((s, x) => s + x.due, 0);

  return (
    <Page title="Outstanding Dues" sub="All invoices with unpaid balances.">
      <div className="grid-4" style={{ marginBottom: 18 }}>
        <div className="card card-pad stat"><div className="n" style={{ color: "var(--danger)" }}>{formatINR(totalDue)}</div><div className="l">Total Outstanding</div></div>
        <div className="card card-pad stat"><div className="n" style={{ color: "var(--warn)" }}>{withDues.length}</div><div className="l">Unpaid Invoices</div></div>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0 }}>Unpaid Invoices</h2>
        </div>
        {withDues.length === 0 ? <Empty>No outstanding dues — all invoices are fully paid! 🎉</Empty> : (
          <table>
            <thead><tr><th>Invoice</th><th>Patient</th><th>Phone</th><th>Date</th><th className="right">Total</th><th className="right">Paid</th><th className="right">Due</th><th></th></tr></thead>
            <tbody>
              {withDues.map(({ order: o, due }) => {
                const p = getPatient(o.patientId);
                const paid = o.grandTotalPaise - due;
                return (
                  <tr key={o.id}>
                    <td><b>{o.invoiceNo}</b></td>
                    <td>{p?.name}<div className="muted" style={{ fontSize: 12 }}>{p && ageString(p)}</div></td>
                    <td className="mono">{p?.phone}</td>
                    <td className="muted">{fmtDate(o.createdAt)}</td>
                    <td className="right mono">{formatINR(o.grandTotalPaise)}</td>
                    <td className="right mono" style={{ color: "var(--ok)" }}>{formatINR(paid)}</td>
                    <td className="right mono" style={{ color: "var(--danger)", fontWeight: 700 }}>{formatINR(due)}</td>
                    <td><Link to={`/order/${o.id}`} className="btn">Collect →</Link></td>
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
