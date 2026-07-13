import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm } from "../ui/bits";

export default function Reagents() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ name: "", unit: "kit", stockQty: "", reorderLevel: "", expiryDate: "" });

  // Stock in/out form
  const [moveReagentId, setMoveReagentId] = useState<string | null>(null);
  const [moveDelta, setMoveDelta] = useState("");
  const [moveReason, setMoveReason] = useState("Received from supplier");

  function save() {
    if (!form.name.trim()) return;
    store.addReagent({
      name: form.name.trim(),
      unit: form.unit,
      stockQty: Number(form.stockQty) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      expiryDate: form.expiryDate || undefined,
    });
    reset(); setShow(false);
  }

  function doMove() {
    if (!moveReagentId || !moveDelta) return;
    store.moveStock(moveReagentId, Number(moveDelta), moveReason);
    setMoveReagentId(null); setMoveDelta(""); setMoveReason("Received from supplier");
  }

  const lowStock = store.reagents.filter((r) => r.stockQty <= r.reorderLevel);
  const expiringSoon = store.reagents.filter((r) => {
    if (!r.expiryDate) return false;
    const diff = new Date(r.expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000; // within 30 days
  });

  return (
    <Page title="Reagents & Inventory" sub="Track reagent stock, expiry dates, and reorder levels." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ Add Reagent</button>
    }>
      {(lowStock.length > 0 || expiringSoon.length > 0) && (
        <div className="grid-2" style={{ marginBottom: 16 }}>
          {lowStock.length > 0 && (
            <div className="card card-pad" style={{ borderLeft: "4px solid var(--danger)" }}>
              <b style={{ color: "var(--danger)" }}>⚠ Low Stock ({lowStock.length})</b>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{lowStock.map((r) => `${r.name} (${r.stockQty} ${r.unit})`).join(", ")}</div>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="card card-pad" style={{ borderLeft: "4px solid var(--warn)" }}>
              <b style={{ color: "var(--warn)" }}>⏰ Expiring Soon ({expiringSoon.length})</b>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{expiringSoon.map((r) => `${r.name} (${r.expiryDate})`).join(", ")}</div>
            </div>
          )}
        </div>
      )}

      {show && (
        <Section title="New Reagent">
          <div className="grid-3">
            <Field label="Reagent Name *"><input {...bind("name")} /></Field>
            <Field label="Unit">
              <select {...bind("unit")}>{["kit", "box", "bottle", "mL", "pcs"].map((u) => <option key={u}>{u}</option>)}</select>
            </Field>
            <Field label="Opening Stock"><input {...bind("stockQty")} className="input mono" /></Field>
            <Field label="Reorder Level"><input {...bind("reorderLevel")} className="input mono" /></Field>
            <Field label="Expiry Date"><input {...bind("expiryDate")} type="date" /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save</button>
        </Section>
      )}

      {moveReagentId && (
        <Section title={`Stock Movement — ${store.reagents.find((r) => r.id === moveReagentId)?.name}`}>
          <div className="grid-3">
            <Field label="Qty (+in / −out)"><input className="input mono" value={moveDelta} onChange={(e) => setMoveDelta(e.target.value)} placeholder="+10 or -5" /></Field>
            <Field label="Reason">
              <select className="input" value={moveReason} onChange={(e) => setMoveReason(e.target.value)}>
                {["Received from supplier", "Used in testing", "Expired/discarded", "Returned", "Adjustment"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="&nbsp;">
              <div className="row">
                <button className="btn btn-primary" onClick={doMove}>Save</button>
                <button className="btn" onClick={() => setMoveReagentId(null)}>Cancel</button>
              </div>
            </Field>
          </div>
        </Section>
      )}

      <Section title={`Reagents (${store.reagents.length})`} pad={false}>
        {store.reagents.length === 0 ? <Empty>No reagents added. Click + to add your first reagent.</Empty> : (
          <table>
            <thead><tr><th>Reagent</th><th>Unit</th><th>Stock</th><th>Reorder Level</th><th>Expiry</th><th></th></tr></thead>
            <tbody>
              {store.reagents.map((r) => {
                const isLow = r.stockQty <= r.reorderLevel;
                return (
                  <tr key={r.id}>
                    <td><b>{r.name}</b></td>
                    <td>{r.unit}</td>
                    <td className="mono" style={{ color: isLow ? "var(--danger)" : undefined, fontWeight: isLow ? 700 : 400 }}>{r.stockQty} {isLow && "⚠"}</td>
                    <td className="mono muted">{r.reorderLevel}</td>
                    <td className="muted">{r.expiryDate ? fmtDate(r.expiryDate) : "—"}</td>
                    <td><button className="btn" onClick={() => setMoveReagentId(r.id)}>Stock In/Out</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>
    </Page>
  );
}
