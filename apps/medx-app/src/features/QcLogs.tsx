import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm, todayISO } from "../ui/bits";

function westgardFlag(value: number, mean: number, sd: number): { flag: string; cls: string } | null {
  if (sd <= 0) return null;
  const z = (value - mean) / sd;
  const absZ = Math.abs(z);
  if (absZ > 3) return { flag: "1-3s REJECT", cls: "badge-danger" };
  if (absZ > 2) return { flag: "1-2s WARNING", cls: "badge-warn" };
  return null;
}

export default function QcLogs() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ date: todayISO(), analyzer: "", test: "", level: "L1", value: "", mean: "", sd: "", remark: "" });

  function save() {
    if (!form.analyzer.trim() || !form.test.trim() || !form.value) return;
    store.addQcLog({
      date: form.date,
      analyzer: form.analyzer.trim(),
      test: form.test.trim(),
      level: form.level,
      value: Number(form.value),
      mean: Number(form.mean),
      sd: Number(form.sd),
      remark: form.remark.trim() || undefined,
    });
    reset(); setShow(false);
  }

  return (
    <Page title="QC / IQC Logs" sub="Daily internal quality control with Westgard-rule flagging." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ Log QC</button>
    }>
      {show && (
        <Section title="New QC Entry">
          <div className="grid-3">
            <Field label="Date *"><input {...bind("date")} type="date" /></Field>
            <Field label="Analyzer *"><input {...bind("analyzer")} placeholder="e.g. BC-6200" /></Field>
            <Field label="Test *"><input {...bind("test")} placeholder="e.g. Haemoglobin" /></Field>
            <Field label="Level">
              <select {...bind("level")}>{["L1", "L2", "L3"].map((l) => <option key={l}>{l}</option>)}</select>
            </Field>
            <Field label="Observed Value *"><input {...bind("value")} className="input mono" /></Field>
            <Field label="Target Mean"><input {...bind("mean")} className="input mono" /></Field>
            <Field label="Target SD"><input {...bind("sd")} className="input mono" /></Field>
            <Field label="Remark"><input {...bind("remark")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save Entry</button>
        </Section>
      )}
      <Section title={`QC Log (${store.qcLogs.length})`} pad={false}>
        {store.qcLogs.length === 0 ? <Empty>No QC entries yet. Start logging daily IQC data.</Empty> : (
          <table>
            <thead><tr><th>Date</th><th>Analyzer</th><th>Test</th><th>Level</th><th className="right">Value</th><th className="right">Mean</th><th className="right">SD</th><th>Westgard</th><th>Remark</th></tr></thead>
            <tbody>
              {store.qcLogs.map((q) => {
                const wg = westgardFlag(q.value, q.mean, q.sd);
                return (
                  <tr key={q.id}>
                    <td>{fmtDate(q.date)}</td>
                    <td>{q.analyzer}</td>
                    <td><b>{q.test}</b></td>
                    <td>{q.level}</td>
                    <td className="right mono">{q.value}</td>
                    <td className="right mono muted">{q.mean}</td>
                    <td className="right mono muted">{q.sd}</td>
                    <td>{wg ? <span className={`badge ${wg.cls}`}>{wg.flag}</span> : <span className="badge badge-ok">OK</span>}</td>
                    <td className="muted">{q.remark ?? ""}</td>
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
