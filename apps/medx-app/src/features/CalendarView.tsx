import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm, todayISO } from "../ui/bits";
import type { Appointment } from "../data/types";

const STATUS_BADGE: Record<Appointment["status"], string> = {
  Scheduled: "badge-info", Arrived: "badge-warn", Done: "badge-ok", Missed: "badge-danger",
};

export default function CalendarView() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const [viewDate, setViewDate] = useState(todayISO());
  const { form, bind, reset } = useForm({ date: todayISO(), time: "10:00", patientName: "", phone: "", purpose: "Sample Collection" });

  function save() {
    if (!form.patientName.trim()) return;
    store.addAppointment({
      date: form.date,
      time: form.time,
      patientName: form.patientName.trim(),
      phone: form.phone.trim() || undefined,
      purpose: form.purpose,
      status: "Scheduled",
    });
    reset(); setShow(false);
  }

  const dayApps = store.appointments.filter((a) => a.date === viewDate);
  const sorted = [...dayApps].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <Page title="Appointments" sub="Schedule and manage patient appointments." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ New Appointment</button>
    }>
      {show && (
        <Section title="Schedule Appointment">
          <div className="grid-3">
            <Field label="Date *"><input {...bind("date")} type="date" /></Field>
            <Field label="Time *"><input {...bind("time")} type="time" /></Field>
            <Field label="Patient Name *"><input {...bind("patientName")} /></Field>
            <Field label="Phone"><input {...bind("phone")} /></Field>
            <Field label="Purpose">
              <select {...bind("purpose")}>
                {["Sample Collection", "Report Collection", "Follow-up", "Consultation", "Other"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="&nbsp;"><button className="btn btn-primary" onClick={save}>Save</button></Field>
          </div>
        </Section>
      )}
      <div className="row" style={{ marginBottom: 16, alignItems: "center" }}>
        <Field label="View Date"><input className="input" type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} /></Field>
        <div className="muted" style={{ marginLeft: 12 }}>{sorted.length} appointments on {fmtDate(viewDate)}</div>
      </div>
      <Section title={fmtDate(viewDate)} pad={false}>
        {sorted.length === 0 ? <Empty>No appointments on this date.</Empty> : (
          <table>
            <thead><tr><th>Time</th><th>Patient</th><th>Phone</th><th>Purpose</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.time}</b></td>
                  <td>{a.patientName}</td>
                  <td className="mono">{a.phone ?? "—"}</td>
                  <td className="muted">{a.purpose}</td>
                  <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                  <td>
                    <div className="row">
                      {a.status === "Scheduled" && <button className="btn" onClick={() => store.setAppointmentStatus(a.id, "Arrived")}>Arrived</button>}
                      {a.status === "Arrived" && <button className="btn btn-primary" onClick={() => store.setAppointmentStatus(a.id, "Done")}>Done</button>}
                      {(a.status === "Scheduled") && <button className="btn" style={{ color: "var(--danger)" }} onClick={() => store.setAppointmentStatus(a.id, "Missed")}>Missed</button>}
                    </div>
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
