import { useState } from "react";
import { useStore } from "../data/store";
import { formatINR, rupeesToPaise } from "../core/money";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm } from "../ui/bits";

export default function CorporateBilling() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ clientId: "", period: "", description: "", amount: "" });

  function save() {
    if (!form.clientId || !form.period.trim()) return;
    store.addCorporateBill({
      clientId: form.clientId,
      period: form.period.trim(),
      description: form.description.trim(),
      amountPaise: rupeesToPaise(form.amount || "0"),
      status: "Unpaid",
    });
    reset(); setShow(false);
  }

  return (
    <Page title="Corporate Billing" sub="Generate and track corporate batch bills for MOU clients." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ New Bill</button>
    }>
      {show && (
        <Section title="New Corporate Bill">
          <div className="grid-3">
            <Field label="Client *">
              <select {...bind("clientId")}>
                <option value="">Select…</option>
                {store.mouClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Period *"><input {...bind("period")} placeholder="e.g. Jul 2026" /></Field>
            <Field label="Amount (₹)"><input {...bind("amount")} className="input mono" /></Field>
            <Field label="Description" wide><input {...bind("description")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Create Bill</button>
        </Section>
      )}
      <Section title={`Corporate Bills (${store.corporateBills.length})`} pad={false}>
        {store.corporateBills.length === 0 ? <Empty>No corporate bills created.</Empty> : (
          <table>
            <thead><tr><th>Client</th><th>Period</th><th>Description</th><th className="right">Amount</th><th>Status</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {store.corporateBills.map((b) => {
                const client = store.mouClients.find((c) => c.id === b.clientId);
                return (
                  <tr key={b.id}>
                    <td><b>{client?.name ?? "—"}</b></td>
                    <td>{b.period}</td>
                    <td className="muted">{b.description || "—"}</td>
                    <td className="right mono">{formatINR(b.amountPaise)}</td>
                    <td>
                      <span className={`badge ${b.status === "Paid" ? "badge-ok" : "badge-danger"}`}>{b.status}</span>
                    </td>
                    <td className="muted">{fmtDate(b.createdAt)}</td>
                    <td>
                      {b.status === "Unpaid" && (
                        <button className="btn" onClick={() => store.setCorporateBillStatus(b.id, "Paid")}>Mark Paid</button>
                      )}
                    </td>
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
