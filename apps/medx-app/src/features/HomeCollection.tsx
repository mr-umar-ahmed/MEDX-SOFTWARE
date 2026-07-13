import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm, todayISO } from "../ui/bits";
import type { HomeVisit } from "../data/types";

const STATUS_BADGE: Record<HomeVisit["status"], string> = {
  Scheduled: "badge-info", Collected: "badge-warn", Received: "badge-ok", Cancelled: "badge-danger",
};

export default function HomeCollection() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const { form, bind, reset } = useForm({ date: todayISO(), slot: "09:00 - 11:00", patientName: "", phone: "", address: "", phlebotomist: "", notes: "" });

  function save() {
    if (!form.patientName.trim() || !form.address.trim()) return;
    store.addHomeVisit({
      date: form.date,
      slot: form.slot,
      patientName: form.patientName.trim(),
      phone: form.phone.trim() || undefined,
      address: form.address.trim(),
      phlebotomist: form.phlebotomist.trim() || undefined,
      status: "Scheduled",
      notes: form.notes.trim() || undefined,
    });
    reset(); setShow(false);
  }

  const upcoming = store.homeVisits.filter((v) => v.status === "Scheduled" || v.status === "Collected");
  const past = store.homeVisits.filter((v) => v.status === "Received" || v.status === "Cancelled");

  return (
    <Page title="Home Collection" sub="Schedule and manage phlebotomist home visits." actions={
      <button className="btn btn-primary" onClick={() => setShow(!show)}>＋ New Visit</button>
    }>
      {show && (
        <Section title="Schedule Home Visit">
          <div className="grid-3">
            <Field label="Date *"><input {...bind("date")} type="date" /></Field>
            <Field label="Time Slot">
              <select {...bind("slot")}>
                {["09:00 - 11:00", "11:00 - 13:00", "14:00 - 16:00", "16:00 - 18:00"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Patient Name *"><input {...bind("patientName")} /></Field>
            <Field label="Phone"><input {...bind("phone")} /></Field>
            <Field label="Address *" wide><input {...bind("address")} /></Field>
            <Field label="Phlebotomist"><input {...bind("phlebotomist")} /></Field>
            <Field label="Notes"><input {...bind("notes")} /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Schedule Visit</button>
        </Section>
      )}
      <Section title={`Upcoming (${upcoming.length})`} pad={false}>
        {upcoming.length === 0 ? <Empty>No upcoming home visits.</Empty> : (
          <table>
            <thead><tr><th>Date</th><th>Slot</th><th>Patient</th><th>Phone</th><th>Address</th><th>Phlebotomist</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {upcoming.map((v) => (
                <tr key={v.id}>
                  <td><b>{fmtDate(v.date)}</b></td>
                  <td>{v.slot}</td>
                  <td>{v.patientName}</td>
                  <td className="mono">{v.phone ?? "—"}</td>
                  <td className="muted" style={{ maxWidth: 200 }}>{v.address}</td>
                  <td>{v.phlebotomist ?? "—"}</td>
                  <td><span className={`badge ${STATUS_BADGE[v.status]}`}>{v.status}</span></td>
                  <td>
                    <div className="row">
                      {v.status === "Scheduled" && <button className="btn" onClick={() => store.setHomeVisitStatus(v.id, "Collected")}>Collected</button>}
                      {v.status === "Collected" && <button className="btn btn-primary" onClick={() => store.setHomeVisitStatus(v.id, "Received")}>Received</button>}
                      {v.status === "Scheduled" && <button className="btn" style={{ color: "var(--danger)" }} onClick={() => store.setHomeVisitStatus(v.id, "Cancelled")}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
      {past.length > 0 && (
        <Section title={`Past Visits (${past.length})`} pad={false}>
          <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Address</th><th>Status</th></tr></thead>
            <tbody>
              {past.slice(0, 20).map((v) => (
                <tr key={v.id}>
                  <td>{fmtDate(v.date)}</td>
                  <td>{v.patientName}</td>
                  <td className="muted">{v.address}</td>
                  <td><span className={`badge ${STATUS_BADGE[v.status]}`}>{v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </Page>
  );
}
