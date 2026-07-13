import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { fmtDateTime, ageString } from "../lib/format";
import { Page, Empty } from "../ui/bits";

export default function Verification() {
  const { orders, getPatient, verifyOrder } = useStore();

  // Orders where ALL results are entered but NOT verified
  const readyToVerify = orders.filter((o) =>
    o.status !== "reported" && o.status !== "delivered" &&
    o.items.every((it) => it.results.every((r) => r.value !== "")) &&
    o.items.some((it) => !it.verified)
  );

  const alreadyVerified = orders.filter((o) => o.status === "reported" || o.status === "delivered").slice(0, 10);

  return (
    <Page title="Verification" sub="Review and lock results — verified reports cannot be changed.">
      <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Ready for Verification ({readyToVerify.length})</h2>
        </div>
        {readyToVerify.length === 0 ? <Empty>No orders pending verification.</Empty> : (
          <table>
            <thead><tr><th>Invoice / Acc</th><th>Patient</th><th>Tests</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {readyToVerify.map((o) => {
                const p = getPatient(o.patientId);
                const abnCount = o.items.reduce((s, it) => s + it.results.filter((r) => r.abnormal).length, 0);
                return (
                  <tr key={o.id}>
                    <td><b>{o.invoiceNo}</b><div className="muted" style={{ fontSize: 12 }}>{o.accessionNo}</div></td>
                    <td>{p?.name}<div className="muted" style={{ fontSize: 12 }}>{p && `${ageString(p)} · ${p.sex}`}</div></td>
                    <td>{o.items.length} {abnCount > 0 && <span className="badge badge-danger">{abnCount} abnormal</span>}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{fmtDateTime(o.createdAt)}</td>
                    <td>
                      <div className="row">
                        <Link to={`/order/${o.id}`} className="btn">Review</Link>
                        <button className="btn btn-primary" onClick={() => verifyOrder(o.id)}>✓ Verify & Lock</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {alreadyVerified.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ margin: 0 }}>Recently Verified</h2>
          </div>
          <table>
            <thead><tr><th>Invoice</th><th>Patient</th><th>Verified By</th><th>Verified At</th><th></th></tr></thead>
            <tbody>
              {alreadyVerified.map((o) => {
                const p = getPatient(o.patientId);
                return (
                  <tr key={o.id}>
                    <td><b>{o.invoiceNo}</b></td>
                    <td>{p?.name}</td>
                    <td>{o.verifiedBy ?? "—"}</td>
                    <td className="muted">{o.verifiedAt ? fmtDateTime(o.verifiedAt) : "—"}</td>
                    <td><Link to={`/order/${o.id}`} className="btn">View →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
