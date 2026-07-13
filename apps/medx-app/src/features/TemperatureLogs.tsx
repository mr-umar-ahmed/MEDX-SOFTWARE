import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm, todayISO, nowHM } from "../ui/bits";

export default function TemperatureLogs() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ date: todayISO(), time: nowHM(), equipment: "", tempC: "", low: "", high: "", by: "" });

  function save() {
    if (!form.equipment.trim() || !form.tempC) return;
    store.addTemperatureLog({
      date: form.date,
      time: form.time,
      equipment: form.equipment.trim(),
      tempC: Number(form.tempC),
      low: Number(form.low) || 2,
      high: Number(form.high) || 8,
      by: form.by.trim() || undefined,
    });
    reset(); setShow(false);
  }

  return (
    <Page title="Temperature Monitoring" sub="Log and monitor equipment temperatures — refrigerators, freezers, water baths." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ Log Temperature</button>
    }>
      {show && (
        <Section title="Log Temperature">
          <div className="grid-3">
            <Field label="Date *"><input {...bind("date")} type="date" /></Field>
            <Field label="Time *"><input {...bind("time")} type="time" /></Field>
            <Field label="Equipment *"><input {...bind("equipment")} placeholder="e.g. Reagent Fridge" /></Field>
            <Field label="Temperature (°C) *"><input {...bind("tempC")} className="input mono" /></Field>
            <Field label="Min Limit (°C)"><input {...bind("low")} className="input mono" placeholder="2" /></Field>
            <Field label="Max Limit (°C)"><input {...bind("high")} className="input mono" placeholder="8" /></Field>
            <Field label="Recorded By"><input {...bind("by")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save</button>
        </Section>
      )}
      <Section title={`Logs (${store.temperatureLogs.length})`} pad={false}>
        {store.temperatureLogs.length === 0 ? <Empty>No temperature logs recorded yet.</Empty> : (
          <table>
            <thead><tr><th>Date</th><th>Time</th><th>Equipment</th><th className="right">Temp °C</th><th>Range</th><th>Status</th><th>By</th></tr></thead>
            <tbody>
              {store.temperatureLogs.map((t) => {
                const outOfRange = t.tempC < t.low || t.tempC > t.high;
                return (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td>{t.time}</td>
                    <td><b>{t.equipment}</b></td>
                    <td className="right mono" style={{ color: outOfRange ? "var(--danger)" : undefined, fontWeight: outOfRange ? 700 : 400 }}>{t.tempC}°C</td>
                    <td className="mono muted">{t.low}–{t.high}°C</td>
                    <td>{outOfRange ? <span className="badge badge-danger">OUT OF RANGE</span> : <span className="badge badge-ok">OK</span>}</td>
                    <td className="muted">{t.by ?? "—"}</td>
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
