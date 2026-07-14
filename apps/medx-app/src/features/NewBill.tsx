import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../data/store";
import { formatINR, rupeesToPaise, paiseToRupees } from "../core/money";
import { computeInvoice } from "../core/gst";
import { searchCatalog, COMMON_PANELS, getTest, COMMON_TESTS } from "../catalog";
import type { Sex } from "../core/ranges";
import type { Payment, Patient, OrderSource, OrderPriority } from "../data/types";
import { ageString } from "../lib/format";
import { Page, Field } from "../ui/bits";

interface Line { testCode: string; testName: string; category: string; sampleType: string; pricePaise: number; discountPaise: number }

export default function NewBill() {
  const nav = useNavigate();
  const location = useLocation();
  const store = useStore();
  const prefill = (location.state ?? {}) as { estimateId?: string; items?: Line[]; name?: string; phone?: string };

  // Step 1 — patient
  const [patientQuery, setPatientQuery] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [name, setName] = useState(prefill.name ?? "");
  const [sex, setSex] = useState<Sex>("M");
  const [ageY, setAgeY] = useState("");
  const [ageM, setAgeM] = useState("");
  const [phone, setPhone] = useState(prefill.phone ?? "");
  const [address, setAddress] = useState("");
  const [abha, setAbha] = useState("");

  // Step 2 — referral context
  const [doctor, setDoctor] = useState("");
  const [source, setSource] = useState<OrderSource>("Walk-in");
  const [priority, setPriority] = useState<OrderPriority>("Routine");

  // Step 3 — tests & billing
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>(prefill.items ?? []);
  const [billDiscount, setBillDiscount] = useState("");
  const [gstRate, setGstRate] = useState<number>(store.settings.defaultGstRatePct);
  const [payMode, setPayMode] = useState<Payment["mode"]>("Cash");
  const [payAmount, setPayAmount] = useState("");

  const patients = useStore((s) => s.patients);
  const patientMatches = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return [];
    return patients.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.uhid.toLowerCase().includes(q)).slice(0, 6);
  }, [patients, patientQuery]);

  const results = useMemo(() => (query.trim() ? searchCatalog(query, 20) : []), [query]);

  function addTest(code: string, testName: string, category: string, sampleType: string, pricePaise: number) {
    if (lines.some((l) => l.testCode === code)) return;
    setLines((ls) => [...ls, { testCode: code, testName, category, sampleType, pricePaise, discountPaise: 0 }]);
    setQuery("");
  }
  function addPanel(panelCode: string) {
    const panel = COMMON_PANELS.find((p) => p.code === panelCode);
    if (!panel) return;
    const added: Line[] = [];
    for (const tc of panel.testCodes) {
      const t = getTest(tc);
      if (t && !lines.some((l) => l.testCode === tc) && !added.some((l) => l.testCode === tc))
        added.push({ testCode: t.code, testName: t.name, category: t.category, sampleType: t.sampleType, pricePaise: t.defaultPricePaise, discountPaise: 0 });
    }
    setLines((ls) => [...ls, ...added]);
  }

  const bill = useMemo(() => computeInvoice({
    supplierStateCode: store.settings.stateCode,
    placeOfSupplyStateCode: store.settings.stateCode,
    billDiscountPaise: rupeesToPaise(billDiscount || "0"),
    lines: lines.map((l) => ({ name: l.testName, unitPricePaise: l.pricePaise, discountPaise: l.discountPaise, exempt: gstRate <= 0, gstRatePct: gstRate, ref: l.testCode })),
  }), [lines, billDiscount, gstRate, store.settings.stateCode]);

  const paid = payAmount === "" ? bill.grandTotalPaise : rupeesToPaise(payAmount);
  const balance = bill.grandTotalPaise - paid;
  const patientReady = selected != null || (name.trim() && phone.trim());
  const canSave = patientReady && lines.length > 0;

  function save() {
    if (!canSave) return;

    // Enforce Starter Tier Limits
    const tier = store.activeLicense?.tier || "Starter";
    if (tier === "Starter") {
      const todayStr = new Date().toDateString();
      const todayOrders = store.orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
      if (todayOrders.length >= 15) {
        alert("Daily patient limit (15) reached for Starter plan.\n\nPlease upgrade to Pro or Enterprise to unlock unlimited daily patient registrations.");
        return;
      }
    }

    const order = store.createOrder({
      patient: selected
        ? { ...selected }
        : { name: name.trim(), sex, ageYears: ageY ? Number(ageY) : undefined, ageMonths: ageM ? Number(ageM) : undefined, phone: phone.trim(), address: address.trim(), abha: abha.trim() || undefined },
      doctorId: doctor.trim() ? findOrCreateDoctor(doctor.trim()) : undefined,
      source,
      priority,
      items: lines,
      billDiscountPaise: rupeesToPaise(billDiscount || "0"),
      gstRatePct: gstRate,
      payment: payMode === "Due" ? undefined : { amountPaise: paid, mode: payMode },
    });
    if (prefill.estimateId) store.markEstimateConverted(prefill.estimateId, order.id);
    nav(`/order/${order.id}?tab=samples`);
  }


  function findOrCreateDoctor(nm: string): string {
    const existing = store.doctors.find((d) => d.name.toLowerCase() === nm.toLowerCase());
    if (existing) return existing.id;
    return store.addDoctor({ name: nm }).id;
  }

  return (
    <Page title="Create New Bill Order" sub="Register pathology requests, apply GST rates, and issue print barcode slips.">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="col" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 1. Patient Selection */}
          <div className="card card-pad">
            <h2>① Patient Selection</h2>
            {selected ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--primary-soft)", borderRadius: 8, padding: "10px 14px" }}>
                <div>
                  <b>{selected.name}</b> <span className="badge badge-info">{selected.uhid}</span>
                  <div className="muted" style={{ fontSize: 13 }}>{ageString(selected)} · {selected.sex} · {selected.phone}</div>
                </div>
                <button className="btn" onClick={() => setSelected(null)}>Change</button>
              </div>
            ) : (
              <>
                <div className="row">
                  <input className="input col" placeholder="🔍 Search existing patients by Name, UHID, or Mobile…" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
                  <button className="btn" onClick={() => setShowNewPatient((v) => !v)}>👤 New Patient</button>
                </div>
                {patientMatches.length > 0 && (
                  <div className="card" style={{ marginTop: 6 }}>
                    {patientMatches.map((m) => (
                      <div key={m.id} className="search-result" onClick={() => { setSelected(m); setPatientQuery(""); }}>
                        <span><b>{m.name}</b> <span className="muted">· {m.uhid} · {ageString(m)} · {m.phone}</span></span>
                        <span className="tag-sendout">select ↵</span>
                      </div>
                    ))}
                  </div>
                )}
                {(showNewPatient || patientQuery === "" ) && (
                  <div className="grid-2" style={{ marginTop: 14 }}>
                    <Field label="Full Name *" wide><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" /></Field>
                    <Field label="Phone *"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" /></Field>
                    <Field label="Sex *">
                      <div className="pill-toggle">
                        {(["M", "F", "O"] as Sex[]).map((s) => (
                          <button key={s} type="button" className={sex === s ? "on" : ""} onClick={() => setSex(s)}>{s === "M" ? "Male" : s === "F" ? "Female" : "Other"}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Age (Years / Months)">
                      <div className="row">
                        <input className="input" value={ageY} onChange={(e) => setAgeY(e.target.value)} placeholder="Years" inputMode="numeric" />
                        <input className="input" value={ageM} onChange={(e) => setAgeM(e.target.value)} placeholder="Months" inputMode="numeric" />
                      </div>
                    </Field>
                    <Field label={store.settings.abdmEnabled ? "ABHA Number" : "ABHA Number (optional)"}><input className="input" value={abha} onChange={(e) => setAbha(e.target.value)} placeholder="14-digit ABHA" /></Field>
                    <Field label="Address" wide><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" /></Field>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 2. Referral details & context */}
          <div className="card card-pad">
            <h2>② Referral Details &amp; Context</h2>
            <div className="grid-3">
              <Field label="Referring Doctor">
                <input className="input" value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Self Referral" list="docs" />
                <datalist id="docs">{store.doctors.map((d) => <option key={d.id} value={d.name} />)}</datalist>
              </Field>
              <Field label="Order Source">
                <select className="input" value={source} onChange={(e) => setSource(e.target.value as OrderSource)}>
                  {["Walk-in", "Doctor Referral", "Home Collection", "B2B / MOU", "Camp"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Priority Status">
                <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as OrderPriority)}>
                  {["Routine", "Urgent", "STAT"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* 3. Tests */}
          <div className="card card-pad">
            <h2>③ Select Diagnostic Tests</h2>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 Type test name or code (e.g. CBC, FBS, LFT)…" />
            {results.length > 0 && (
              <div className="card" style={{ marginTop: 6, maxHeight: 260, overflow: "auto" }}>
                {results.map((t) => (
                  <div key={t.code} className="search-result" onClick={() => addTest(t.code, t.name, t.category, t.sampleType, t.defaultPricePaise)}>
                    <span>{t.name} <span className="muted">· {t.category}</span> {t.sendOut && <span className="tag-sendout">SEND-OUT</span>}</span>
                    <b className="mono">{formatINR(t.defaultPricePaise)}</b>
                  </div>
                ))}
              </div>
            )}
            {lines.length === 0 ? (
              <div className="muted" style={{ textAlign: "center", padding: "22px 0", border: "1px dashed var(--border)", borderRadius: 8, marginTop: 12 }}>No tests selected yet.</div>
            ) : (
              <table style={{ marginTop: 12 }}>
                <thead><tr><th>Test</th><th>Sample</th><th className="right" style={{ width: 110 }}>Rate ₹</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.testCode}>
                      <td><b>{l.testName}</b> <span className="muted">· {l.category}</span></td>
                      <td className="muted">{l.sampleType}</td>
                      <td><input className="input mono" style={{ textAlign: "right", padding: "5px 7px" }} value={paiseToRupees(l.pricePaise)} onChange={(e) => setLines((ls) => ls.map((x, xi) => xi === i ? { ...x, pricePaise: rupeesToPaise(e.target.value || "0") } : x))} /></td>
                      <td><button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={() => setLines((ls) => ls.filter((_, xi) => xi !== i))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>QUICK ADD</div>
              <div className="row" style={{ flexWrap: "wrap" }}>
                {COMMON_PANELS.map((p) => <button key={p.code} className="btn" onClick={() => addPanel(p.code)}>＋ {p.name}</button>)}
                {COMMON_TESTS.slice(0, 6).map((t) => <button key={t.code} className="btn" onClick={() => addTest(t.code, t.name, t.category, t.sampleType, t.defaultPricePaise)}>＋ {t.code}</button>)}
              </div>
            </div>
          </div>
        </div>

        {/* Billing summary */}
        <div className="card" style={{ width: 380, position: "sticky", top: 84 }}>
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}><h2 style={{ margin: 0 }}>₹ Billing Summary</h2></div>
          <div className="card-pad">
            <SRow label="Subtotal" value={formatINR(bill.grossPaise)} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0" }}>
              <span className="muted">Discount (₹)</span>
              <input className="input mono" style={{ width: 120, textAlign: "right", padding: "5px 7px" }} value={billDiscount} onChange={(e) => setBillDiscount(e.target.value)} placeholder="0" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0" }}>
              <span className="muted">GST</span>
              <select className="input" style={{ width: 120 }} value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))}>
                <option value={0}>Exempt</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
              </select>
            </div>
            <SRow label={`CGST (${gstRate / 2}%)`} value={formatINR(bill.cgstPaise)} />
            <SRow label={`SGST (${gstRate / 2}%)`} value={formatINR(bill.sgstPaise)} />
            {bill.roundOffPaise !== 0 && <SRow label="Round Off" value={formatINR(bill.roundOffPaise)} />}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTop: "2px solid var(--border)", fontSize: 20, fontWeight: 800 }}>
              <span>Grand Total</span><span className="mono" style={{ color: "var(--primary-dark)" }}>{formatINR(bill.grandTotalPaise)}</span>
            </div>

            <div style={{ margin: "14px 0 4px", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", color: "var(--text-dim)" }}>💳 PAYMENT COLLECTION</div>
            <div className="grid-2">
              <Field label="Mode">
                <select className="input" value={payMode} onChange={(e) => setPayMode(e.target.value as Payment["mode"])}>
                  {["Cash", "UPI", "Card", "Due"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Amount Collected (₹)">
                <input className="input mono" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(paiseToRupees(bill.grandTotalPaise))} disabled={payMode === "Due"} />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontWeight: 700 }}>
              {payMode === "Due" ? (
                <><span style={{ color: "var(--danger)" }}>Full amount due</span><span className="mono" style={{ color: "var(--danger)" }}>{formatINR(bill.grandTotalPaise)}</span></>
              ) : balance <= 0 ? (
                <><span style={{ color: "var(--ok)" }}>Fully Paid</span><span className="mono" style={{ color: "var(--ok)" }}>{formatINR(paid)}</span></>
              ) : (
                <><span style={{ color: "var(--warn)" }}>Balance Due</span><span className="mono" style={{ color: "var(--warn)" }}>{formatINR(balance)}</span></>
              )}
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} disabled={!canSave} onClick={save}>
              🧾 Register &amp; Generate Barcodes
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
}

function SRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span className="muted">{label}</span><span className="mono">{value}</span></div>;
}
