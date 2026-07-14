import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { fmtDateTime, ageString } from "../lib/format";
import { Page, Empty } from "../ui/bits";
import { generateReportPdf } from "../core/pdfReport";

export default function DeliveryStatus() {
  const { orders, getPatient, getDoctor, markDelivered, settings } = useStore();
  const [filter, setFilter] = useState<"all" | "pending" | "delivered">("all");

  const reported = orders.filter((o) => o.status === "reported" || o.status === "delivered");
  const filtered = reported.filter((o) => {
    if (filter === "pending" && o.status !== "reported") return false;
    if (filter === "delivered" && o.status !== "delivered") return false;
    return true;
  });

  function whatsapp(orderId: string) {
    const tier = useStore.getState().activeLicense?.tier || "Starter";
    if (tier === "Starter") {
      alert("WhatsApp delivery is a Pro feature.\n\nPlease upgrade your license to instantly share reports with patients.");
      return;
    }
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    const p = getPatient(o.patientId);
    if (!p) return;
    const text = `Namaste ${p.name}, your test report from ${settings.name} is ready.\nInvoice: ${o.invoiceNo}\nThank you.`;
    const phone = p.phone.replace(/\D/g, "");
    const num = phone.length === 10 ? "91" + phone : phone;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
    markDelivered(orderId, "WhatsApp");
  }

  function downloadPdf(orderId: string) {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    const p = getPatient(o.patientId);
    const d = getDoctor(o.doctorId);
    if (!p) return;
    generateReportPdf(o, p, d, settings);
  }

  return (
    <Page title="Delivery Status" sub="Track which reports have been sent to patients.">
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <div className="pill-toggle">
            <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>All</button>
            <button className={filter === "pending" ? "on" : ""} onClick={() => setFilter("pending")}>Not Sent</button>
            <button className={filter === "delivered" ? "on" : ""} onClick={() => setFilter("delivered")}>Delivered</button>
          </div>
          <div className="muted" style={{ marginLeft: "auto" }}>{filtered.length} reports</div>
        </div>
        {filtered.length === 0 ? <Empty>No reports to show.</Empty> : (
          <table>
            <thead><tr><th>Invoice</th><th>Patient</th><th>Phone</th><th>Verified</th><th>Delivered Via</th><th></th></tr></thead>
            <tbody>
              {filtered.map((o) => {
                const p = getPatient(o.patientId);
                return (
                  <tr key={o.id}>
                    <td><Link to={`/order/${o.id}`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>{o.invoiceNo}</Link></td>
                    <td>{p?.name}<div className="muted" style={{ fontSize: 12 }}>{p && ageString(p)}</div></td>
                    <td className="mono">{p?.phone}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{o.verifiedAt ? fmtDateTime(o.verifiedAt) : "—"}</td>
                    <td>
                      {o.deliveredVia ? (
                        <span className="badge badge-ok">{o.deliveredVia} · {o.deliveredAt ? fmtDateTime(o.deliveredAt) : ""}</span>
                      ) : (
                        <span className="badge badge-warn">Not sent</span>
                      )}
                    </td>
                    <td>
                      {o.status === "reported" && (
                        <div className="row">
                          <button className="btn" title="Download PDF" onClick={() => downloadPdf(o.id)} style={{ padding: "4px 10px" }}>📄</button>
                          <button className="btn" onClick={() => whatsapp(o.id)}>📱 WhatsApp</button>
                          <button className="btn" onClick={() => { markDelivered(o.id, "Print"); }}>🖨 Print</button>
                          <button className="btn" onClick={() => { markDelivered(o.id, "Email"); }}>📧 Email</button>
                        </div>
                      )}
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

