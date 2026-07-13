import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm, todayISO } from "../ui/bits";

export default function Sops() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ title: "", category: "Pre-analytical", version: "1.0", effectiveDate: todayISO(), notes: "" });

  function save() {
    if (!form.title.trim()) return;
    store.addSop({
      title: form.title.trim(),
      category: form.category,
      version: form.version,
      effectiveDate: form.effectiveDate,
      notes: form.notes.trim() || undefined,
    });
    reset(); setShow(false);
  }

  const categories = [...new Set(store.sops.map((s) => s.category))];

  return (
    <Page title="Standard Operating Procedures" sub="Maintain SOP document registry for NABL/ISO compliance." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ Add SOP</button>
    }>
      {show && (
        <Section title="New SOP Entry">
          <div className="grid-3">
            <Field label="Title *" wide><input {...bind("title")} placeholder="e.g. Blood Collection Procedure" /></Field>
            <Field label="Category">
              <select {...bind("category")}>
                {["Pre-analytical", "Analytical", "Post-analytical", "Safety", "Equipment", "Administration", "Other"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Version"><input {...bind("version")} /></Field>
            <Field label="Effective Date"><input {...bind("effectiveDate")} type="date" /></Field>
            <Field label="Notes"><input {...bind("notes")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save SOP</button>
        </Section>
      )}
      <Section title={`SOPs (${store.sops.length})`} pad={false}>
        {store.sops.length === 0 ? <Empty>No SOPs registered. Add your standard operating procedures for NABL compliance.</Empty> : (
          <table>
            <thead><tr><th>Title</th><th>Category</th><th>Version</th><th>Effective</th><th>Notes</th></tr></thead>
            <tbody>
              {store.sops.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.title}</b></td>
                  <td><span className="badge badge-info">{s.category}</span></td>
                  <td className="mono">{s.version}</td>
                  <td className="muted">{fmtDate(s.effectiveDate)}</td>
                  <td className="muted">{s.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </Page>
  );
}
