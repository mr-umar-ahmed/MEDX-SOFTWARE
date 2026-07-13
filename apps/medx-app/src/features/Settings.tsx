import { useState } from "react";
import { useStore } from "../data/store";
import type { LabSettings } from "../data/types";

const FIELDS: Array<{ k: keyof LabSettings; label: string; wide?: boolean }> = [
  { k: "name", label: "Lab Name", wide: true },
  { k: "tagline", label: "Tagline" },
  { k: "invoicePrefix", label: "Invoice Prefix" },
  { k: "addressLine", label: "Address", wide: true },
  { k: "city", label: "City" },
  { k: "stateName", label: "State" },
  { k: "stateCode", label: "GST State Code" },
  { k: "phone", label: "Phone" },
  { k: "email", label: "Email" },
  { k: "gstin", label: "GSTIN" },
  { k: "footerNote", label: "Report Footer Note", wide: true },
];

export default function Settings() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState<LabSettings>(settings);
  const [saved, setSaved] = useState(false);

  function save() {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="topbar no-print">
        <h1>Settings</h1>
        <button className="btn btn-primary" onClick={save}>{saved ? "✓ Saved" : "Save Changes"}</button>
      </div>
      <div className="content">
        <div className="card card-pad" style={{ maxWidth: 720 }}>
          <h2>Lab Profile</h2>
          <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>This information appears on every invoice and report. Set it up once during installation.</div>
          <div className="grid-2">
            {FIELDS.map((f) => (
              <div key={f.k} className="field" style={f.wide ? { gridColumn: "1 / span 2" } : undefined}>
                <label>{f.label}</label>
                <input className="input" value={String(form[f.k] ?? "")} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad" style={{ maxWidth: 720, marginTop: 16 }}>
          <h2>Data &amp; Backup</h2>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            All patient data is stored locally on this PC and works fully offline. In the packaged desktop app, MedX
            takes automatic scheduled backups to a folder or USB drive. (Backup scheduling is wired up in the Electron build.)
          </div>
          <div className="row">
            <button className="btn" onClick={() => exportData()}>⬇ Export data (JSON)</button>
            <button className="btn btn-danger" onClick={() => { if (confirm("This clears ALL local demo data. Continue?")) { localStorage.removeItem("medx-store-v1"); location.reload(); } }}>Reset demo data</button>
          </div>
        </div>
      </div>
    </>
  );
}

function exportData() {
  const raw = localStorage.getItem("medx-store-v1") ?? "{}";
  const blob = new Blob([raw], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `medx-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}
