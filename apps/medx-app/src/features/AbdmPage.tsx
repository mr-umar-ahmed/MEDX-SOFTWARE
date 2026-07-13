import { useStore } from "../data/store";
import { Page, Section, Field } from "../ui/bits";
import { useState } from "react";

export default function AbdmPage() {
  const { settings, updateSettings } = useStore();
  const [hipId, setHipId] = useState(settings.abdmHipId);
  const [saved, setSaved] = useState(false);

  function save() {
    updateSettings({ abdmEnabled: !settings.abdmEnabled ? true : settings.abdmEnabled, abdmHipId: hipId.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Page title="ABDM / ABHA Integration" sub="Configure Ayushman Bharat Digital Mission (ABDM) settings.">
      <div className="card card-pad" style={{ maxWidth: 720 }}>
        <h2>🇮🇳 ABDM Configuration</h2>
        <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
          When enabled, the registration form will prompt for ABHA numbers and the system will be ready for Health Information Provider (HIP) integration.
        </div>

        <div className="grid-2">
          <Field label="ABDM Integration">
            <div className="pill-toggle">
              <button className={settings.abdmEnabled ? "on" : ""} onClick={() => updateSettings({ abdmEnabled: true })}>Enabled</button>
              <button className={!settings.abdmEnabled ? "on" : ""} onClick={() => updateSettings({ abdmEnabled: false })}>Disabled</button>
            </div>
          </Field>
          <Field label="HIP ID">
            <input className="input" value={hipId} onChange={(e) => setHipId(e.target.value)} placeholder="Your ABDM HIP ID" />
          </Field>
        </div>

        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={save}>{saved ? "✓ Saved" : "Save Settings"}</button>
      </div>

      <div className="card card-pad" style={{ maxWidth: 720, marginTop: 16 }}>
        <h2>ABDM Roadmap</h2>
        <div className="muted" style={{ fontSize: 13 }}>
          <p>Full ABDM integration is planned for the <b>Enterprise</b> plan (M7 milestone) and includes:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>ABHA number verification at registration</li>
            <li>Care-Context linking for Health Information Provider (HIP)</li>
            <li>Consent management for health records</li>
            <li>Health record push to ABDM-compliant apps</li>
          </ul>
        </div>
      </div>
    </Page>
  );
}
