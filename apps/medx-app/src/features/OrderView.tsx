import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore, orderDuePaise, orderPaidPaise } from "../data/store";
import JsBarcode from "jsbarcode";
import { formatINR } from "../core/money";
import { fmtDate, fmtDateTime, ageString, sexLabel } from "../lib/format";
import { getTest } from "../catalog";
import { StatusBadge } from "./Dashboard";
import { generateReportPdf } from "../core/pdfReport";
import type { Order } from "../data/types";

type Tab = "results" | "report" | "invoice" | "barcode" | "receipt";

export default function OrderView() {
  const { id = "" } = useParams();
  const store = useStore();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const [tab, setTab] = useState<Tab>("results");

  if (!order) return <div className="content"><div className="card card-pad">Order not found. <Link to="/worklist">Back to worklist</Link></div></div>;
  const patient = store.getPatient(order.patientId);

  return (
    <>
      <div className="topbar no-print">
        <div>
          <h1>{patient?.name} <span className="muted" style={{ fontSize: 15, fontWeight: 400 }}>· {order.invoiceNo}</span></h1>
          <div className="muted" style={{ fontSize: 13 }}>
            {patient && `${ageString(patient)} · ${sexLabel(patient.sex)} · ${patient.phone}`} · Acc {order.accessionNo} · <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="row">
          <div className="pill-toggle">
            <button className={tab === "results" ? "on" : ""} onClick={() => setTab("results")}>Enter Results</button>
            <button className={tab === "report" ? "on" : ""} onClick={() => setTab("report")}>Report</button>
            <button className={tab === "invoice" ? "on" : ""} onClick={() => setTab("invoice")}>Invoice</button>
            <button className={tab === "barcode" ? "on" : ""} onClick={() => setTab("barcode")}>🏷 Barcodes</button>
            <button className={tab === "receipt" ? "on" : ""} onClick={() => setTab("receipt")}>🧾 Receipt</button>
          </div>
        </div>
      </div>
      <div className="content">
        {tab === "results" && <ResultsTab order={order} />}
        {tab === "report" && <ReportTab order={order} />}
        {tab === "invoice" && <InvoiceTab order={order} />}
        {tab === "barcode" && <BarcodeTab order={order} />}
        {tab === "receipt" && <ReceiptTab order={order} />}
      </div>
    </>
  );
}

/* ---------------- Results entry ---------------- */
function ResultsTab({ order }: { order: Order }) {
  const store = useStore();
  const allEntered = order.items.every((it) => it.results.every((r) => r.value !== ""));

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input.result-field, select.result-field")
      );
      const idx = inputs.indexOf(e.currentTarget);
      if (idx >= 0 && idx < inputs.length - 1) {
        const next = inputs[idx + 1];
        next.focus();
        if (next instanceof HTMLInputElement) {
          next.select();
        }
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {order.items.map((it) => {
        const def = getTest(it.testCode);
        return (
          <div key={it.testCode} className="card">
            <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><b>{it.testName}</b> <span className="muted">· {it.sampleType}</span></div>
              {it.verified ? <span className="badge badge-ok">✓ Verified</span> : <span className="badge badge-warn">Pending</span>}
            </div>
            <table>
              <thead><tr><th>Parameter</th><th style={{ width: 180 }}>Result</th><th>Unit</th><th>Reference Range</th><th style={{ width: 60 }}>Flag</th></tr></thead>
              <tbody>
                {it.results.map((r) => {
                  const analyte = def?.analytes.find((a) => a.code === r.analyteCode);
                  return (
                    <tr key={r.analyteCode}>
                      <td>{analyte?.name ?? r.analyteCode}</td>
                      <td>
                        {analyte?.inputType === "select" ? (
                          <select className="input result-field" value={r.value} onKeyDown={handleKeyDown} onChange={(e) => store.setResult(order.id, it.testCode, r.analyteCode, e.target.value)}>
                            <option value="">—</option>
                            {analyte.options?.map((o) => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input className="input mono result-field" value={r.value} placeholder={analyte?.defaultText ?? ""} onKeyDown={handleKeyDown} onChange={(e) => store.setResult(order.id, it.testCode, r.analyteCode, e.target.value)} />
                        )}
                      </td>
                      <td className="muted">{r.unit ?? analyte?.unit ?? ""}</td>
                      <td className="muted mono">{r.rangeText || ""}</td>
                      <td>{r.flag && r.flag !== "N" ? <span className={`flag-${r.flag} ${r.critical ? "flag-crit" : ""}`}>{r.flag}</span> : r.value && r.flag === "N" ? "N" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      <div className="card card-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="muted">{allEntered ? "All results entered. Verify to lock the report." : "Enter all results, then verify."}</div>
        <div className="row" style={{ alignItems: "center" }}>
          {order.status !== "reported" ? (
            <button className="btn btn-primary btn-lg" disabled={!allEntered} onClick={() => store.verifyOrder(order.id)}>✓ Verify &amp; Lock Report</button>
          ) : (
            <>
              <span className="badge badge-ok">Verified {order.verifiedAt ? "on " + fmtDate(order.verifiedAt) : ""}</span>
              <button className="btn" style={{ marginLeft: 12 }} onClick={() => store.unlockOrder(order.id)}>✏ Unlock to Edit Report</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Printable report ---------------- */
function ReportTab({ order }: { order: Order }) {
  const store = useStore();
  const s = store.settings;
  const patient = store.getPatient(order.patientId);
  const doctor = store.getDoctor(order.doctorId);
  const verified = order.status === "reported";

  function whatsapp() {
    const tier = store.activeLicense?.tier || "Starter";
    if (tier === "Starter") {
      alert("WhatsApp delivery is a Pro feature.\n\nPlease upgrade your license to instantly share reports with patients.");
      return;
    }
    if (!patient) return;
    const text = `Namaste ${patient.name}, your test report from ${s.name} is ready.\nInvoice: ${order.invoiceNo}\nDate: ${fmtDate(order.createdAt)}\nThank you.`;
    const phone = patient.phone.replace(/\D/g, "");
    const num = phone.length === 10 ? "91" + phone : phone;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div>
      <div className="no-print row" style={{ marginBottom: 14, justifyContent: "flex-end" }}>
        {!verified && <span className="badge badge-warn" style={{ alignSelf: "center", marginRight: "auto" }}>⚠ Not verified — provisional</span>}
        <button className="btn" onClick={() => generateReportPdf(order, patient, doctor, s)}>📥 Download PDF</button>
        <button className="btn" onClick={whatsapp}>WhatsApp Patient</button>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print</button>
      </div>
      <div className="report-sheet">
        <div className="report-head">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 24 }}>M</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-dark)" }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{s.addressLine}, {s.city}, {s.stateName}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{s.phone} · {s.email}</div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12 }}>
            <div><b>GSTIN:</b> {s.gstin}</div>
            <div>Acc No: <b>{order.accessionNo}</b></div>
          </div>
        </div>

        <div className="report-title">LABORATORY TEST REPORT</div>

        <div className="report-meta">
          <div><b>Patient:</b> {patient?.name}</div>
          <div><b>Report Date:</b> {order.verifiedAt ? fmtDate(order.verifiedAt) : fmtDate(order.createdAt)}</div>
          <div><b>Age / Sex:</b> {patient && `${ageString(patient)} / ${sexLabel(patient.sex)}`}</div>
          <div><b>Reg Date:</b> {fmtDate(order.createdAt)}</div>
          <div><b>Ref. Doctor:</b> {doctor?.name ?? "Self"}</div>
          <div><b>Invoice:</b> {order.invoiceNo}</div>
        </div>

        {order.items.map((it) => {
          const def = getTest(it.testCode);
          return (
            <div key={it.testCode} style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary-dark)", borderBottom: "1px solid #ccc", paddingBottom: 4 }}>{it.testName}</div>
              <table className="report-table">
                <thead><tr><th>Investigation</th><th>Result</th><th>Unit</th><th>Reference Range</th></tr></thead>
                <tbody>
                  {it.results.map((r) => {
                    const analyte = def?.analytes.find((a) => a.code === r.analyteCode);
                    const abn = r.abnormal;
                    return (
                      <tr key={r.analyteCode}>
                        <td>{analyte?.name ?? r.analyteCode}</td>
                        <td style={{ fontWeight: abn ? 800 : 500 }} className={abn ? `flag-${r.flag}` : ""}>{r.value || "—"} {abn && r.flag && <span>({r.flag})</span>}</td>
                        <td>{r.unit ?? analyte?.unit ?? ""}</td>
                        <td>{r.rangeText || (analyte?.ranges?.length ? "" : "—")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        <div className="report-sign">
          <div style={{ fontSize: 11, color: "#666", maxWidth: 360 }}>{s.footerNote}</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #333", paddingTop: 4, minWidth: 180 }}>{order.verifiedBy ?? "Consultant Pathologist"}</div>
            <div style={{ fontSize: 12, color: "#666" }}>Verified {order.verifiedAt ? fmtDateTime(order.verifiedAt) : ""}</div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#999", marginTop: 16 }}>*** End of Report ***</div>
      </div>
    </div>
  );
}

/* ---------------- Printable GST invoice ---------------- */
function InvoiceTab({ order }: { order: Order }) {
  const store = useStore();
  const s = store.settings;
  const patient = store.getPatient(order.patientId);
  const due = orderDuePaise(order);
  const paid = orderPaidPaise(order);

  return (
    <div>
      <div className="no-print row" style={{ marginBottom: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print Invoice</button>
      </div>
      <div className="report-sheet">
        <div className="report-head">
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-dark)" }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{s.addressLine}, {s.city}</div>
            <div style={{ fontSize: 12, color: "#555" }}>GSTIN: {s.gstin}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>TAX INVOICE</div>
            <div style={{ fontSize: 13 }}>{order.invoiceNo}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{fmtDate(order.createdAt)}</div>
          </div>
        </div>
        <div className="report-meta" style={{ marginTop: 14 }}>
          <div><b>Bill To:</b> {patient?.name}</div>
          <div><b>Phone:</b> {patient?.phone}</div>
          <div><b>Age/Sex:</b> {patient && `${ageString(patient)} / ${sexLabel(patient.sex)}`}</div>
          <div><b>SAC:</b> 999316</div>
        </div>
        <table className="report-table" style={{ marginTop: 16 }}>
          <thead><tr><th>#</th><th>Test / Service</th><th className="right">Rate</th><th className="right">Disc</th><th className="right">Amount</th></tr></thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={it.testCode}>
                <td>{i + 1}</td><td>{it.testName}</td>
                <td className="right mono">{formatINR(it.pricePaise)}</td>
                <td className="right mono">{it.discountPaise ? formatINR(it.discountPaise) : "—"}</td>
                <td className="right mono">{formatINR(it.pricePaise - it.discountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <div style={{ width: 280 }}>
            <IRow label="Sub Total" value={formatINR(order.grossPaise)} />
            {order.discountPaise > 0 && <IRow label="Discount" value={"− " + formatINR(order.discountPaise)} />}
            {order.cgstPaise > 0 && <><IRow label="CGST" value={formatINR(order.cgstPaise)} /><IRow label="SGST" value={formatINR(order.sgstPaise)} /></>}
            {order.igstPaise > 0 && <IRow label="IGST" value={formatINR(order.igstPaise)} />}
            {order.roundOffPaise !== 0 && <IRow label="Round Off" value={formatINR(order.roundOffPaise)} />}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid #333", fontWeight: 800, fontSize: 17 }}>
              <span>Grand Total</span><span className="mono">{formatINR(order.grandTotalPaise)}</span>
            </div>
            <IRow label="Paid" value={formatINR(paid)} />
            {due > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)", fontWeight: 700 }}><span>Balance Due</span><span className="mono">{formatINR(due)}</span></div>}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#777", marginTop: 24 }}>
          Diagnostic services by a clinical establishment are exempt under GST Notification 12/2017 (Healthcare Services). Tax shown only where applicable.
        </div>
      </div>
    </div>
  );
}

function IRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span className="muted">{label}</span><span className="mono">{value}</span></div>;
}

/* ---------------- Barcode labels ---------------- */
function BarcodeLabel({ accession, patient, test, date }: { accession: string; patient: string; test: string; date: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, accession, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 4,
        });
      } catch { /* invalid barcode value */ }
    }
  }, [accession]);
  return (
    <div className="barcode-label">
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{patient}</div>
      <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>{test} · {date}</div>
      <svg ref={svgRef} />
    </div>
  );
}

function BarcodeTab({ order }: { order: Order }) {
  const store = useStore();
  const patient = store.getPatient(order.patientId);
  const date = fmtDate(order.createdAt);
  return (
    <div>
      <div className="no-print row" style={{ marginBottom: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print Labels</button>
      </div>
      <div className="barcode-grid">
        {order.items.map((it) => (
          <BarcodeLabel key={it.testCode} accession={order.accessionNo} patient={patient?.name ?? ""} test={it.testName} date={date} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Thermal receipt (58mm) ---------------- */
function ReceiptTab({ order }: { order: Order }) {
  const store = useStore();
  const s = store.settings;
  const patient = store.getPatient(order.patientId);
  const due = orderDuePaise(order);
  const paid = orderPaidPaise(order);
  const receiptRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (receiptRef.current) {
      try {
        JsBarcode(receiptRef.current, order.accessionNo, {
          format: "CODE128", width: 1, height: 30, displayValue: true, fontSize: 10, margin: 2,
        });
      } catch { /* */ }
    }
  }, [order.accessionNo]);

  return (
    <div>
      <div className="no-print row" style={{ marginBottom: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print Receipt</button>
      </div>
      <div className="thermal-receipt">
        <div style={{ textAlign: "center", borderBottom: "1px dashed #333", paddingBottom: 6, marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{s.name}</div>
          <div style={{ fontSize: 9 }}>{s.addressLine}, {s.city}</div>
          <div style={{ fontSize: 9 }}>{s.phone}</div>
          {s.gstin && <div style={{ fontSize: 8 }}>GSTIN: {s.gstin}</div>}
        </div>
        <div style={{ fontSize: 10, marginBottom: 6 }}>
          <div><b>Invoice:</b> {order.invoiceNo}</div>
          <div><b>Patient:</b> {patient?.name}</div>
          <div><b>Date:</b> {fmtDateTime(order.createdAt)}</div>
        </div>
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "1px dashed #999" }}><th style={{ textAlign: "left", padding: "2px 0" }}>Item</th><th style={{ textAlign: "right", padding: "2px 0" }}>₹</th></tr></thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={it.testCode}><td style={{ padding: "2px 0" }}>{i + 1}. {it.testName}</td><td style={{ textAlign: "right", padding: "2px 0" }}>{formatINR(it.pricePaise - it.discountPaise)}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: "1px dashed #333", marginTop: 6, paddingTop: 4, fontSize: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{formatINR(order.grossPaise)}</span></div>
          {order.discountPaise > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><span>-{formatINR(order.discountPaise)}</span></div>}
          {order.cgstPaise > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>CGST+SGST</span><span>{formatINR(order.cgstPaise + order.sgstPaise)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, borderTop: "1px solid #333", paddingTop: 4, marginTop: 4 }}>
            <span>TOTAL</span><span>{formatINR(order.grandTotalPaise)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}><span>Paid</span><span>{formatINR(paid)}</span></div>
          {due > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Due</span><span>{formatINR(due)}</span></div>}
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <svg ref={receiptRef} />
        </div>
        <div style={{ textAlign: "center", fontSize: 8, color: "#666", marginTop: 6, borderTop: "1px dashed #999", paddingTop: 4 }}>
          Thank you for visiting {s.name}
        </div>
      </div>
    </div>
  );
}
