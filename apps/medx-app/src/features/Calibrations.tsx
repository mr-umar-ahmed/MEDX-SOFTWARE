import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm, todayISO } from "../ui/bits";

export default function Calibrations() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ equipment: "", lastDone: todayISO(), dueDate: "", remark: "" });

  function save() {
    if (!form.equipment.trim() || !form.dueDate) return;
    store.addCalibration({
      equipment: form.equipment.trim(),
      lastDone: form.lastDone,
      dueDate: form.dueDate,
      remark: form.remark.trim() || undefined,
    });
    reset(); setShow(false);
  }

  const overdue = store.calibrations.filter((c) => new Date(c.dueDate) < new Date());
  const upcoming = store.calibrations.filter((c) => {
    const diff = new Date(c.dueDate).getTime() - Date.now();
    return diff > 0 && diff < 14 * 86400000;
  });

  return (
    <Page title="Calibrations" sub="Track equipment calibration schedules and due dates." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ Add Calibration</button>
    }>
      {(overdue.length > 0 || upcoming.length > 0) && (
        <div className="grid-2" style={{ marginBottom: 16 }}>
          {overdue.length > 0 && (
            <div className="card card-pad" style={{ borderLeft: "4px solid var(--danger)" }}>
              <b style={{ color: "var(--danger)" }}>⚠ Overdue ({overdue.length})</b>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{overdue.map((c) => `${c.equipment} (due ${fmtDate(c.dueDate)})`).join(", ")}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="card card-pad" style={{ borderLeft: "4px solid var(--warn)" }}>
              <b style={{ color: "var(--warn)" }}>⏰ Due Soon ({upcoming.length})</b>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{upcoming.map((c) => `${c.equipment} (${fmtDate(c.dueDate)})`).join(", ")}</div>
            </div>
          )}
        </div>
      )}
      {show && (
        <Section title="Add Calibration Entry">
          <div className="grid-2">
            <Field label="Equipment *" wide><input {...bind("equipment")} placeholder="e.g. BC-6200 Hematology Analyzer" /></Field>
            <Field label="Last Done"><input {...bind("lastDone")} type="date" /></Field>
            <Field label="Due Date *"><input {...bind("dueDate")} type="date" /></Field>
            <Field label="Remark"><input {...bind("remark")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save</button>
        </Section>
      )}
      <Section title={`Calibrations (${store.calibrations.length})`} pad={false}>
        {store.calibrations.length === 0 ? <Empty>No calibration entries. Add equipment calibration schedules.</Empty> : (
          <table>
            <thead><tr><th>Equipment</th><th>Last Done</th><th>Due Date</th><th>Status</th><th>Remark</th><th></th></tr></thead>
            <tbody>
              {store.calibrations.map((c) => {
                const isOverdue = new Date(c.dueDate) < new Date();
                return (
                  <tr key={c.id}>
                    <td><b>{c.equipment}</b></td>
                    <td className="muted">{fmtDate(c.lastDone)}</td>
                    <td style={{ color: isOverdue ? "var(--danger)" : undefined, fontWeight: isOverdue ? 700 : 400 }}>{fmtDate(c.dueDate)}</td>
                    <td>{isOverdue ? <span className="badge badge-danger">OVERDUE</span> : <span className="badge badge-ok">OK</span>}</td>
                    <td className="muted">{c.remark ?? "—"}</td>
                    <td>
                      <button className="btn" onClick={() => store.updateCalibration(c.id, { lastDone: todayISO(), dueDate: "" })}>Mark Done</button>
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
