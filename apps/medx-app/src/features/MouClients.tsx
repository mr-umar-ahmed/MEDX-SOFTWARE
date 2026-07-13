import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm } from "../ui/bits";

export default function MouClients() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ name: "", contact: "", discountPct: "", notes: "" });

  function save() {
    if (!form.name.trim()) return;
    store.addMouClient({
      name: form.name.trim(),
      contact: form.contact.trim() || undefined,
      discountPct: form.discountPct ? Number(form.discountPct) : 0,
      notes: form.notes.trim() || undefined,
    });
    reset(); setShow(false);
  }

  return (
    <Page title="MOU / B2B Clients" sub="Manage corporate and B2B clients with special discount agreements." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ Add Client</button>
    }>
      {show && (
        <Section title="New MOU Client">
          <div className="grid-2">
            <Field label="Organization Name *" wide><input {...bind("name")} /></Field>
            <Field label="Contact Person / Phone"><input {...bind("contact")} /></Field>
            <Field label="Discount %"><input {...bind("discountPct")} className="input mono" placeholder="e.g. 20" /></Field>
            <Field label="Notes" wide><input {...bind("notes")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save Client</button>
        </Section>
      )}
      <Section title={`Clients (${store.mouClients.length})`} pad={false}>
        {store.mouClients.length === 0 ? <Empty>No MOU clients added.</Empty> : (
          <table>
            <thead><tr><th>Organization</th><th>Contact</th><th>Discount</th><th>Notes</th><th>Added</th></tr></thead>
            <tbody>
              {store.mouClients.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.contact ?? "—"}</td>
                  <td className="mono">{c.discountPct}%</td>
                  <td className="muted">{c.notes ?? "—"}</td>
                  <td className="muted">{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </Page>
  );
}
