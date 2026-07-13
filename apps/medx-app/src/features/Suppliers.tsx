import { useState } from "react";
import { useStore } from "../data/store";
import { Page, Section, Field, Empty, useForm } from "../ui/bits";

export default function Suppliers() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ name: "", phone: "", notes: "" });

  function save() {
    if (!form.name.trim()) return;
    store.addSupplier({ name: form.name.trim(), phone: form.phone.trim() || undefined, notes: form.notes.trim() || undefined });
    reset(); setShow(false);
  }

  return (
    <Page title="Suppliers" sub="Manage reagent and consumable suppliers." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ Add Supplier</button>
    }>
      {show && (
        <Section title="New Supplier">
          <div className="grid-3">
            <Field label="Supplier Name *"><input {...bind("name")} /></Field>
            <Field label="Phone"><input {...bind("phone")} /></Field>
            <Field label="Notes"><input {...bind("notes")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save</button>
        </Section>
      )}
      <Section title={`Suppliers (${store.suppliers.length})`} pad={false}>
        {store.suppliers.length === 0 ? <Empty>No suppliers added.</Empty> : (
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Notes</th></tr></thead>
            <tbody>
              {store.suppliers.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td className="mono">{s.phone ?? "—"}</td>
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
