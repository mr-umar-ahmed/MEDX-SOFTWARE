import { useState } from "react";
import { useStore } from "../data/store";
import { Page, Section, Field } from "../ui/bits";

export default function ReportTemplate() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState({
    reportPathologist: settings.reportPathologist,
    reportPathologistQual: settings.reportPathologistQual,
    reportTechnologist: settings.reportTechnologist,
    reportShowLogo: settings.reportShowLogo,
    footerNote: settings.footerNote,
  });
  const [saved, setSaved] = useState(false);

  function save() {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Page title="Report Template" sub="Customize how pathology reports look when printed." actions={
      <button className="btn btn-primary" onClick={save}>{saved ? "✓ Saved" : "Save Changes"}</button>
    }>
      <div className="card card-pad" style={{ maxWidth: 720 }}>
        <h2>Pathologist & Signatures</h2>
        <div className="grid-2">
          <Field label="Pathologist Name" wide>
            <input className="input" value={form.reportPathologist} onChange={(e) => setForm({ ...form, reportPathologist: e.target.value })} />
          </Field>
          <Field label="Qualifications">
            <input className="input" value={form.reportPathologistQual} onChange={(e) => setForm({ ...form, reportPathologistQual: e.target.value })} />
          </Field>
          <Field label="Lab Technologist">
            <input className="input" value={form.reportTechnologist} onChange={(e) => setForm({ ...form, reportTechnologist: e.target.value })} />
          </Field>
          <Field label="Show Logo">
            <div className="pill-toggle">
              <button className={form.reportShowLogo ? "on" : ""} onClick={() => setForm({ ...form, reportShowLogo: true })}>Yes</button>
              <button className={!form.reportShowLogo ? "on" : ""} onClick={() => setForm({ ...form, reportShowLogo: false })}>No</button>
            </div>
          </Field>
        </div>
      </div>
      <div className="card card-pad" style={{ maxWidth: 720, marginTop: 16 }}>
        <h2>Report Footer</h2>
        <Field label="Footer Note (printed on every report)" wide>
          <textarea className="input" rows={3} value={form.footerNote} onChange={(e) => setForm({ ...form, footerNote: e.target.value })} />
        </Field>
      </div>
    </Page>
  );
}
