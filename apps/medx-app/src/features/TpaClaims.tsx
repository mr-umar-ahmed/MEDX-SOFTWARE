import { useState } from "react";
import { useStore } from "../data/store";
import { formatINR, rupeesToPaise } from "../core/money";
import { fmtDateTime } from "../lib/format";
import { Page, Section, Field, Empty, useForm } from "../ui/bits";
import type { TpaStatus } from "../data/types";

const STATUSES: TpaStatus[] = ["Draft", "Filed", "Approved", "Settled", "Rejected"];

export default function TpaClaims() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ patientName: "", tpaName: "", policyNo: "", claimNo: "", amount: "", notes: "" });

  function save() {
    if (!form.patientName.trim() || !form.tpaName.trim()) return;
    store.addTpaClaim({
      patientName: form.patientName.trim(),
      tpaName: form.tpaName.trim(),
      policyNo: form.policyNo.trim(),
      claimNo: form.claimNo.trim(),
      amountPaise: rupeesToPaise(form.amount || "0"),
      status: "Draft",
      notes: form.notes.trim() || undefined,
    });
    reset(); setShow(false);
  }

  return (
    <Page title="TPA / Insurance Claims" sub="Track insurance claims, pre-auth, and settlement status." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ New Claim</button>
    }>
      {show && (
        <Section title="New TPA Claim">
          <div className="grid-3">
            <Field label="Patient Name *"><input {...bind("patientName")} /></Field>
            <Field label="TPA / Insurer *"><input {...bind("tpaName")} /></Field>
            <Field label="Policy No"><input {...bind("policyNo")} /></Field>
            <Field label="Claim No"><input {...bind("claimNo")} /></Field>
            <Field label="Amount (₹)"><input {...bind("amount")} className="input mono" /></Field>
            <Field label="Notes"><input {...bind("notes")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save Claim</button>
        </Section>
      )}
      <Section title={`Claims (${store.tpaClaims.length})`} pad={false}>
        {store.tpaClaims.length === 0 ? <Empty>No TPA claims filed yet.</Empty> : (
          <table>
            <thead><tr><th>Patient</th><th>TPA / Insurer</th><th>Policy</th><th>Claim #</th><th className="right">Amount</th><th>Status</th><th>Filed</th><th></th></tr></thead>
            <tbody>
              {store.tpaClaims.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.patientName}</b></td>
                  <td>{c.tpaName}</td>
                  <td className="mono">{c.policyNo || "—"}</td>
                  <td className="mono">{c.claimNo || "—"}</td>
                  <td className="right mono">{formatINR(c.amountPaise)}</td>
                  <td>
                    <select className="input" value={c.status} onChange={(e) => store.updateTpaClaim(c.id, { status: e.target.value as TpaStatus })} style={{ width: 110, padding: "4px 8px" }}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="muted" style={{ fontSize: 13 }}>{fmtDateTime(c.filedAt)}</td>
                  <td>
                    {c.status === "Approved" && (
                      <button className="btn" onClick={() => store.updateTpaClaim(c.id, { status: "Settled", settledAt: new Date().toISOString() })}>Mark Settled</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </Page>
  );
}
