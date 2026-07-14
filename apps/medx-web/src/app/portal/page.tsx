"use client";

import { useState } from "react";
import { Download, FileText, CheckCircle, Clock, ArrowLeft, LogOut, FileClock } from "lucide-react";
import { verifyAndFetchReport } from "./actions";

export default function PortalPage() {
  const [invoice, setInvoice] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [session, setSession] = useState<{
    patient: { name: string; ageY?: string; ageM?: string; sex: string; phone: string };
    orders: Array<any>;
  } | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const res = await verifyAndFetchReport(invoice, phone);
      if (res.error) {
        setError(res.error);
      } else if (res.success && res.patient && res.orders) {
        setSession({
          patient: res.patient,
          orders: res.orders
        });
        if (res.orders.length > 0) {
          setSelectedOrderId(res.orders[0].id);
        }
      }
    } catch (err) {
      setError("Failed to verify. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const selectedOrder = session?.orders.find(o => o.id === selectedOrderId);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main style={{ minHeight: "80vh" }}>
      <div className="container">
        
        {!session ? (
          <div className="card text-center" style={{ maxWidth: 500, margin: "24px auto" }}>
            <div style={{ display: "inline-flex", background: "var(--primary-light)", color: "var(--primary)", padding: 16, borderRadius: "50%", marginBottom: 20 }}>
              <Download size={28} />
            </div>
            <h1 className="section-title" style={{ fontSize: 24, marginBottom: 8 }}>Patient Portal</h1>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>Enter details to retrieve your test history and download PDFs.</p>
            
            <form style={{ textAlign: "left" }} onSubmit={handleVerify}>
              {error && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Invoice / Order Number</label>
                <input required type="text" className="input" placeholder="e.g. MEDX-2610-0012" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Registered Phone Number</label>
                <input required type="tel" className="input" placeholder="Enter 10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={loading}>
                {loading ? "Verifying OTP..." : "Access Reports"}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, margin: "16px 0" }}>
            {/* Header bar */}
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>{session.patient.name}</h2>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {session.patient.sex} • {session.patient.ageY ? `${session.patient.ageY} Years` : "N/A"}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSession(null)}>
                <LogOut size={14} /> Log Out
              </button>
            </div>

            {/* Split layout: History sidebar and Report details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* History list */}
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Your Report History</h3>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                  {session.orders.map((o) => {
                    const isReported = o.status === "reported" || o.status === "delivered";
                    const isSelected = o.id === selectedOrderId;
                    return (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrderId(o.id)}
                        style={{
                          flex: "0 0 160px",
                          padding: 12,
                          background: isSelected ? "var(--primary-light)" : "var(--surface)",
                          border: isSelected ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                          borderRadius: 12,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{fmtDate(o.createdAt)}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)", margin: "4px 0" }}>{o.invoiceNo}</div>
                        <div className={`chip ${isReported ? "chip-ok" : "chip-warn"}`} style={{ fontSize: 9, padding: "2px 6px" }}>
                          {isReported ? "Report Ready" : "Pending"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Report content */}
              {selectedOrder && (
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>INVOICE: {selectedOrder.invoiceNo}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>Date: {fmtDate(selectedOrder.createdAt)}</div>
                    </div>

                    {(selectedOrder.status === "reported" || selectedOrder.status === "delivered") && (
                      <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                        <FileText size={14} /> Save PDF
                      </button>
                    )}
                  </div>

                  {/* Pending State */}
                  {selectedOrder.status !== "reported" && selectedOrder.status !== "delivered" ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div style={{ display: "inline-flex", padding: 12, background: "#fef3c7", color: "#d97706", borderRadius: "50%", marginBottom: 16 }}>
                        <Clock size={32} />
                      </div>
                      <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Testing In Progress</h4>
                      <p className="text-muted" style={{ fontSize: 13, maxWidth: 300, margin: "0 auto 16px" }}>
                        Your blood/urine samples are currently undergoing analysis in our laboratory.
                      </p>
                      <div style={{ display: "inline-flex", padding: "6px 12px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                        Current Status: {selectedOrder.status.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16 }}>
                        We will notify you via WhatsApp as soon as your report is verified.
                      </div>
                    </div>
                  ) : (
                    /* Ready Report State */
                    <div>
                      {selectedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: 24 }}>
                          <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)", borderBottom: "1.5px solid var(--border)", paddingBottom: 6, marginBottom: 12 }}>
                            {item.testName}
                          </h4>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {item.results && item.results.map((res: any, rIdx: number) => (
                              <div key={rIdx} className="result-row">
                                <div className="result-label">{res.analyteCode}</div>
                                <div className="result-value">
                                  <span className={res.abnormal ? "result-abnormal" : ""}>
                                    {res.value}
                                  </span>
                                  <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>{res.unit}</span>
                                </div>
                                <div className="result-range">
                                  Ref: {res.rangeText || "N/A"}
                                </div>
                              </div>
                            ))}
                            {(!item.results || item.results.length === 0) && (
                              <div style={{ padding: "12px 0", fontStyle: "italic", color: "var(--muted)", fontSize: 13 }}>
                                Result values pending entry.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
