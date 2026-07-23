import { useState } from "react";
import { useStore } from "../data/store";
import type { LabSettings } from "../data/types";
import { fmtDate } from "../lib/format";
import { runHeartbeat } from "../core/sync";

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
  const { settings, updateSettings, activeLicense, activateLicense, lastHeartbeat } = useStore();
  const [form, setForm] = useState<LabSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [err, setErr] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function handleCheckNow() {
    setChecking(true);
    try {
      await runHeartbeat();
      setCheckedAt(new Date().toLocaleTimeString());
    } finally {
      setChecking(false);
    }
  }

  async function handleActivate() {
    if (!inputKey.trim()) return;
    setErr("");
    const success = await activateLicense(inputKey);
    if (success) {
      setInputKey("");
    } else {
      setErr(
        "This license key failed verification. Make sure you pasted the COMPLETE token " +
        "(it is very long). If it came through WhatsApp/email, copy it again in one piece. " +
        "Keys issued before a security update are invalid — ask your vendor for a fresh key."
      );
    }
  }

  function handleDeactivate() {
    if (confirm("Deactivating your license will log you out and return to the License Activation screen. Continue?")) {
      useStore.getState().logoutAndResetLicense();
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
          <h2>LAN Multi-Counter Sync</h2>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Link multiple PCs in your lab network together to share data in real-time. (Requires Pro or Enterprise license)
          </div>
          {(!activeLicense || activeLicense.tier === "Starter") ? (
            <div style={{ padding: 12, background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 8, color: "#b45309", fontSize: 13 }}>
              🔒 <b>Gated Feature:</b> LAN Multi-Counter is only available under <b>Pro</b> or <b>Enterprise</b> tiers. Please upgrade your license to enable this option.
            </div>
          ) : (
            <div className="grid-2">
              <div className="field" style={{ gridColumn: "1 / span 2" }}>
                <label>Select Local Sync Role</label>
                <select 
                  className="input" 
                  value={form.lanRole || "standalone"} 
                  onChange={(e) => setForm({ ...form, lanRole: e.target.value as any })}
                >
                  <option value="standalone">Standalone (Single PC Mode)</option>
                  <option value="host">Host Mode (This PC acts as the central lab database server)</option>
                  <option value="client">Client Mode (This PC connects to a Host database server over LAN)</option>
                </select>
              </div>

              {form.lanRole === "client" && (
                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                  <label>Host PC IP Address</label>
                  <input 
                    className="input" 
                    value={form.lanHostIp || ""} 
                    onChange={(e) => setForm({ ...form, lanHostIp: e.target.value })} 
                    placeholder="e.g. 192.168.1.10"
                  />
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                    Enter the local IP address of the Host PC. Make sure both computers are connected to the same router network.
                  </div>
                </div>
              )}

              {form.lanRole === "host" && (
                <div style={{ gridColumn: "1 / span 2", padding: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, color: "#065f46", fontSize: 12.5 }}>
                  📡 <b>Host Active:</b> Listening for client connections on Port <b>8095</b>. Share this computer's local IP address with your other counters to connect them.
                </div>
              )}
            </div>
          )}
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
              {lastHeartbeat && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 12,
                  padding: "8px 12px", borderRadius: 8,
                  background: lastHeartbeat.ok ? "#ecfdf5" : "#fef2f2",
                  color: lastHeartbeat.ok ? "#047857" : "#b91c1c",
                  border: `1px solid ${lastHeartbeat.ok ? "#a7f3d0" : "#fecaca"}`,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: lastHeartbeat.ok ? "#10b981" : "#ef4444", flexShrink: 0 }} />
                  <span><b>License server:</b> {lastHeartbeat.message} <span style={{ opacity: 0.7 }}>({new Date(lastHeartbeat.at).toLocaleTimeString()})</span></span>
                </div>
              )}
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <button className="btn" onClick={handleCheckNow} disabled={checking}>
                  {checking ? "Checking…" : "🔄 Check License Status Now"}
                </button>
                <button className="btn btn-danger" onClick={handleDeactivate}>Deactivate License</button>
                {checkedAt && <span className="muted" style={{ fontSize: 12 }}>Checked at {checkedAt} — renewals, plan changes &amp; vendor messages applied.</span>}
              </div>
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
