import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useStore } from "../data/store";
import { formatINR, rupeesToPaise } from "../core/money";
import { fmtDateTime, sexLabel } from "../lib/format";
import type { Sex } from "../core/ranges";
import type { EstimateItem } from "../data/types";
import { searchCatalog } from "../catalog";
import { Page, Section, Field, Empty } from "../ui/bits";

/* ================= New Patient ================= */
export function NewPatient() {
  const store = useStore();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Sex>("M");
  const [ageY, setAgeY] = useState("");
  const [ageM, setAgeM] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [abha, setAbha] = useState("");
  const [savedUhid, setSavedUhid] = useState("");

  function save(goToOrder: boolean) {
    if (!name.trim() || !phone.trim()) return;
    const p = store.upsertPatient({ name: name.trim(), sex, ageYears: ageY ? Number(ageY) : undefined, ageMonths: ageM ? Number(ageM) : undefined, phone: phone.trim(), address: address.trim(), abha: abha.trim() || undefined });
    if (goToOrder) nav("/new");
    else {
      setSavedUhid(p.uhid);
      setName(""); setAgeY(""); setAgeM(""); setPhone(""); setAddress(""); setAbha("");
    }
  }

  return (
    <Page title="New Patient Registration" sub="Register a patient without billing — bill them later from New Order.">
      <div className="card card-pad" style={{ maxWidth: 720 }}>
        {savedUhid && <div className="badge badge-ok" style={{ marginBottom: 12 }}>✓ Patient saved with UHID {savedUhid}</div>}
        <div className="grid-2">
          <Field label="Full Name *" wide><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
          <Field label="Phone *"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Sex *">
            <div className="pill-toggle">
              {(["M", "F", "O"] as Sex[]).map((s) => <button key={s} type="button" className={sex === s ? "on" : ""} onClick={() => setSex(s)}>{sexLabel(s)}</button>)}
            </div>
          </Field>
          <Field label="Age (Years / Months)">
            <div className="row">
              <input className="input" value={ageY} onChange={(e) => setAgeY(e.target.value)} placeholder="Years" />
              <input className="input" value={ageM} onChange={(e) => setAgeM(e.target.value)} placeholder="Months" />
            </div>
          </Field>
          <Field label="ABHA Number"><input className="input" value={abha} onChange={(e) => setAbha(e.target.value)} placeholder="Optional" /></Field>
          <Field label="Address" wide><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary btn-lg" disabled={!name.trim() || !phone.trim()} onClick={() => save(false)}>Save Patient</button>
          <button className="btn btn-lg" disabled={!name.trim() || !phone.trim()} onClick={() => save(true)}>Save &amp; Create Order →</button>
        </div>
      </div>
    </Page>
  );
}

/* ================= Queue / Tokens ================= */
export function Queue() {
  const store = useStore();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("Sample Collection");
  const todayTokens = useMemo(() => store.tokens.filter((t) => new Date(t.issuedAt).toDateString() === new Date().toDateString()), [store.tokens]);
  const serving = todayTokens.find((t) => t.status === "serving");
  const waiting = todayTokens.filter((t) => t.status === "waiting");

  return (
    <Page title="Queue / Tokens" sub="Issue tokens at reception. Open the counter display on a second screen." actions={
      <Link to="/display" target="_blank" className="btn">🖥 Open Counter Display</Link>
    }>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="col">
          <Section title="Issue Token">
            <div className="grid-3">
              <Field label="Patient Name (optional)"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Purpose">
                <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  {["Sample Collection", "Report Collection", "Billing / Enquiry", "Home Collection Booking"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="&nbsp;"><button className="btn btn-primary" onClick={() => { store.issueToken(name.trim() || undefined, purpose); setName(""); }}>🎫 Issue Token</button></Field>
            </div>
          </Section>
          <Section title={`Waiting (${waiting.length})`} pad={false}>
            {waiting.length === 0 ? <Empty>No one waiting.</Empty> : (
              <table>
                <thead><tr><th>Token</th><th>Name</th><th>Purpose</th><th>Issued</th><th></th></tr></thead>
                <tbody>
                  {waiting.map((t) => (
                    <tr key={t.id}>
                      <td><b style={{ fontSize: 16 }}>{t.label}</b></td>
                      <td>{t.name ?? "—"}</td>
                      <td className="muted">{t.purpose}</td>
                      <td className="muted">{fmtDateTime(t.issuedAt)}</td>
                      <td><button className="btn" onClick={() => store.completeToken(t.id)}>Skip</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
        <div className="card card-pad" style={{ width: 320, textAlign: "center" }}>
          <h3>Now Serving</h3>
          <div style={{ fontSize: 56, fontWeight: 900, color: "var(--primary)", margin: "10px 0" }}>{serving?.label ?? "—"}</div>
          {serving?.name && <div className="muted">{serving.name} · {serving.purpose}</div>}
          <button className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={() => store.callNextToken()}>📢 Call Next</button>
          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>{waiting.length} waiting</div>
        </div>
      </div>
    </Page>
  );
}

/** Full-screen counter display — open on the waiting-area TV/monitor. */
export function CounterDisplay() {
  const tokens = useStore((s) => s.tokens);
  const settings = useStore((s) => s.settings);
  const today = tokens.filter((t) => new Date(t.issuedAt).toDateString() === new Date().toDateString());
  const serving = today.find((t) => t.status === "serving");
  const next = today.filter((t) => t.status === "waiting").slice(0, 5);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0c2a31", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#9dc0c4" }}>{settings.name}</div>
      <div style={{ fontSize: 40, marginTop: 30, color: "#cfe4e6" }}>NOW SERVING</div>
      <div style={{ fontSize: 180, fontWeight: 900, color: "#4fd1c5", lineHeight: 1.1 }}>{serving?.label ?? "—"}</div>
      {serving?.name && <div style={{ fontSize: 32, color: "#cfe4e6" }}>{serving.name}</div>}
      <div style={{ marginTop: 50, fontSize: 24, color: "#7fa6ab" }}>
        Next: {next.length ? next.map((t) => t.label).join("  ·  ") : "—"}
      </div>
    </div>
  );
}

/* ================= Estimates ================= */
export function Estimates() {
  const store = useStore();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [discount, setDiscount] = useState("");
  const results = useMemo(() => (query.trim() ? searchCatalog(query, 12) : []), [query]);
  const total = items.reduce((s, i) => s + i.pricePaise, 0) - rupeesToPaise(discount || "0");

  function saveEstimate() {
    if (!name.trim() || items.length === 0) return;
    store.addEstimate(name.trim(), phone.trim(), items, rupeesToPaise(discount || "0"));
    setName(""); setPhone(""); setItems([]); setDiscount("");
  }

  return (
    <Page title="Estimates" sub="Quote prices without registering — convert to an order when the patient agrees.">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="col">
          <Section title="New Estimate">
            <div className="grid-2">
              <Field label="Name *"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Phone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <input className="input" placeholder="🔍 Add tests…" value={query} onChange={(e) => setQuery(e.target.value)} />
              {results.length > 0 && (
                <div className="card" style={{ marginTop: 4, maxHeight: 200, overflow: "auto" }}>
                  {results.map((t) => (
                    <div key={t.code} className="search-result" onClick={() => { setItems((xs) => [...xs, { name: t.name, pricePaise: t.defaultPricePaise }]); setQuery(""); }}>
                      <span>{t.name}</span><b className="mono">{formatINR(t.defaultPricePaise)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {items.length > 0 && (
              <table style={{ marginTop: 10 }}>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}><td>{it.name}</td><td className="right mono">{formatINR(it.pricePaise)}</td>
                      <td style={{ width: 40 }}><button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={() => setItems((xs) => xs.filter((_, xi) => xi !== i))}>✕</button></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
              <span className="muted">Discount ₹</span>
              <input className="input mono" style={{ width: 110 }} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
              <b style={{ marginLeft: "auto", fontSize: 18 }} className="mono">{formatINR(Math.max(0, total))}</b>
              <button className="btn btn-primary" disabled={!name.trim() || items.length === 0} onClick={saveEstimate}>Save Estimate</button>
            </div>
          </Section>
        </div>
        <div className="col">
          <Section title={`Saved Estimates (${store.estimates.length})`} pad={false}>
            {store.estimates.length === 0 ? <Empty>No estimates yet.</Empty> : (
              <table>
                <thead><tr><th>Name</th><th>Tests</th><th className="right">Total</th><th></th></tr></thead>
                <tbody>
                  {store.estimates.map((e) => {
                    const tot = e.items.reduce((s, i) => s + i.pricePaise, 0) - e.discountPaise;
                    return (
                      <tr key={e.id}>
                        <td><b>{e.name}</b><div className="muted" style={{ fontSize: 12 }}>{fmtDateTime(e.createdAt)}</div></td>
                        <td>{e.items.length}</td>
                        <td className="right mono">{formatINR(Math.max(0, tot))}</td>
                        <td>
                          {e.convertedOrderId ? <span className="badge badge-ok">Converted</span> : (
                            <div className="row">
                              <button className="btn" onClick={() => nav("/new", { state: { estimateId: e.id, name: e.name, phone: e.phone, items: e.items.map((it, idx) => ({ testCode: `EST-${idx}-${Date.now()}`, testName: it.name, category: "Estimate", sampleType: "As applicable", pricePaise: it.pricePaise, discountPaise: 0 })) } })}>→ Order</button>
                              <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={() => store.deleteEstimate(e.id)}>✕</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      </div>
    </Page>
  );
}
