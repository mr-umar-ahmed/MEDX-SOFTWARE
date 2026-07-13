import { useState } from "react";
import { useStore } from "../data/store";
import type { LabSettings } from "../data/types";
import { fmtDate } from "../lib/format";

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
  const { settings, updateSettings, activeLicense, activateLicense } = useStore();
  const [form, setForm] = useState<LabSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [err, setErr] = useState("");

  async function handleActivate() {
    if (!inputKey.trim()) return;
    setErr("");
    const success = await activateLicense(inputKey.trim());
    if (success) {
      setInputKey("");
    } else {
      setErr("Invalid license token key. Please check and try again.");
    }
  }

  function handleDeactivate() {
    if (confirm("Deactivating your license will revert the lab to the Starter free tier. Continue?")) {
      useStore.setState({ licenseToken: undefined, activeLicense: null });
    }
  }

  function save() {
    const dataToSave = { ...form };
    if (activeLicense) {
      dataToSave.name = activeLicense.labName;
    }
    updateSettings(dataToSave);
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
            {FIELDS.map((f) => {
              const isLocked = f.k === "name" && !!activeLicense;
              const value = isLocked ? activeLicense.labName : String(form[f.k] ?? "");
              return (
                <div key={f.k} className="field" style={f.wide ? { gridColumn: "1 / span 2" } : undefined}>
                  <label>
                    {f.label} {isLocked && <span style={{ color: "var(--primary)", fontSize: "11px", fontWeight: "bold" }}>(🔒 Locked by License)</span>}
                  </label>
                  <input
                    className="input"
                    value={value}
                    disabled={isLocked}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                  />
                </div>
              );
            })}
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

        <div className="card card-pad" style={{ maxWidth: 720, marginTop: 16 }}>
          <h2>System License</h2>
          {activeLicense ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: 12, background: "var(--primary-soft)", borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, color: "var(--primary-dark)" }}>{activeLicense.tier} Tier License Active</div>
                  <div className="muted" style={{ fontSize: 12 }}>Licensed to: {activeLicense.labName}</div>
                </div>
                <span className="badge badge-ok">✓ Active</span>
              </div>
              <div style={{ fontSize: 13, marginBottom: 14 }}>
                <div><b>License Key:</b> <span className="mono">{activeLicense.licenseKey}</span></div>
                <div><b>Registered Phone:</b> {activeLicense.contactPhone}</div>
                <div><b>Valid Until:</b> {fmtDate(activeLicense.validUntil)}</div>
              </div>
              <button className="btn btn-danger" onClick={handleDeactivate}>Deactivate License</button>
            </div>
          ) : (
            <div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                Your system is running on the free <b>Starter</b> tier. Premium modules (Inventory, referral commission, NABL Quality Control, and ABDM) require a license key.
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Enter License Key Token</label>
                <textarea className="input mono" style={{ height: 80, fontSize: 12 }} value={inputKey} onChange={(e) => setInputKey(e.target.value)} placeholder="Paste your license key token here..." />
              </div>
              {err && <div style={{ color: "var(--danger)", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{err}</div>}
              <button className="btn btn-primary" onClick={handleActivate} disabled={!inputKey.trim()}>Activate License</button>
            </div>
          )}
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
