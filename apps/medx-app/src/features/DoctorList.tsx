import { useState } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm } from "../ui/bits";

export default function DoctorList() {
  const store = useStore();
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { form, bind, reset, setForm } = useForm({ name: "", clinic: "", phone: "", commissionPct: "" });

  function save() {
    if (!form.name.trim()) return;
    if (editId) {
      store.updateDoctor(editId, {
        name: form.name.trim(),
        clinic: form.clinic.trim() || undefined,
        phone: form.phone.trim() || undefined,
        commissionPct: form.commissionPct ? Number(form.commissionPct) : undefined,
      });
      setEditId(null);
    } else {
      store.addDoctor({
        name: form.name.trim(),
        clinic: form.clinic.trim() || undefined,
        phone: form.phone.trim() || undefined,
        commissionPct: form.commissionPct ? Number(form.commissionPct) : undefined,
      });
    }
    reset(); setShow(false);
  }

  function startEdit(id: string) {
    const d = store.doctors.find((x) => x.id === id);
    if (!d) return;
    setForm({ name: d.name, clinic: d.clinic ?? "", phone: d.phone ?? "", commissionPct: d.commissionPct?.toString() ?? "" });
    setEditId(id); setShow(true);
  }

  return (
    <Page title="Referring Doctors" sub="Manage referring doctors, clinics, and commission rates." actions={
      <button className="btn btn-primary" onClick={() => { setShow(!show); setEditId(null); reset(); }}>＋ Add Doctor</button>
    }>
      {show && (
        <Section title={editId ? "Edit Doctor" : "New Doctor"}>
          <div className="grid-2">
            <Field label="Doctor Name *" wide><input {...bind("name")} placeholder="Dr. Sharma" /></Field>
            <Field label="Clinic / Hospital"><input {...bind("clinic")} /></Field>
            <Field label="Phone"><input {...bind("phone")} /></Field>
            <Field label="Commission %"><input {...bind("commissionPct")} className="input mono" placeholder="e.g. 15" /></Field>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={save}>{editId ? "Update" : "Save"}</button>
            <button className="btn" onClick={() => { setShow(false); setEditId(null); reset(); }}>Cancel</button>
          </div>
        </Section>
      )}
      <Section title={`Doctors (${store.doctors.length})`} pad={false}>
        {store.doctors.length === 0 ? <Empty>No referring doctors added yet.</Empty> : (
          <table>
            <thead><tr><th>Name</th><th>Clinic</th><th>Phone</th><th>Commission %</th><th>Referrals</th><th>Added</th><th></th></tr></thead>
            <tbody>
              {store.doctors.map((d) => {
                const referrals = store.orders.filter((o) => o.doctorId === d.id).length;
                return (
                  <tr key={d.id}>
                    <td><b>{d.name}</b></td>
                    <td>{d.clinic ?? "—"}</td>
                    <td className="mono">{d.phone ?? "—"}</td>
                    <td className="mono">{d.commissionPct != null ? `${d.commissionPct}%` : "—"}</td>
                    <td>{referrals}</td>
                    <td className="muted">{fmtDate(d.createdAt)}</td>
                    <td><button className="btn" onClick={() => startEdit(d.id)}>Edit</button></td>
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
