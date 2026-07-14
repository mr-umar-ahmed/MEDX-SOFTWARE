"use client";

import { useState, useEffect } from "react";
import { Key, CheckCircle, ShieldAlert, Copy, RefreshCw, Trash2 } from "lucide-react";

interface License {
  id: string;
  token: string;
  labName: string;
  contactPhone: string;
  tier: "Starter" | "Pro" | "Enterprise";
  issuedAt: string;
  validUntil: string;
  status: "active" | "revoked";
  lastHeartbeatAt?: string;
  devices?: Array<{ deviceId: string; hostname: string; lastSeenAt: string }>;
}

export default function TenantsPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  const [showGen, setShowGen] = useState(false);
  const [genData, setGenData] = useState({ labName: "", contactPhone: "", tier: "Pro", validDays: "365" });
  const [generatedToken, setGeneratedToken] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch all licenses on mount
  useEffect(() => {
    fetchLicenses();
  }, []);

  async function fetchLicenses() {
    setLoading(true);
    try {
      const res = await fetch("/api/licenses");
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses);
      }
    } catch (err) {
      console.error("Failed to fetch licenses:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genData.labName.trim() || !genData.contactPhone.trim()) return;
    setGenerating(true);
    setGeneratedToken("");
    setCopied(false);

    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labName: genData.labName.trim(),
          contactPhone: genData.contactPhone.trim(),
          tier: genData.tier,
          validDays: genData.validDays,
        }),
      });
      const data = await res.json();
      if (data.success && data.license) {
        setGeneratedToken(data.license.token);
        // Refresh the list to show the new license
        fetchLicenses();
      } else {
        alert("Failed to generate: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Are you sure you want to revoke this license? The lab will lose access to paid features.")) return;
    try {
      const res = await fetch("/api/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLicenses();
      }
    } catch (err) {
      alert("Failed to revoke license.");
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function isExpired(iso: string) {
    return new Date(iso) < new Date();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Deployed Labs (Tenants)</h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0 0" }}>Manage active labs and generate cryptographically signed license keys.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={fetchLicenses}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => { setShowGen(true); setGeneratedToken(""); }}>
            <Key size={18} /> Generate License Key
          </button>
        </div>
      </div>

      {/* License Generator Panel */}
      {showGen && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--primary)", borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🔐 Cryptographic License Generator</h2>
            <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }} onClick={() => setShowGen(false)}>✕ Close</button>
          </div>

          <form onSubmit={handleGenerate} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 16, alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Lab Name *</label>
              <input required className="input" placeholder="e.g. Care Point Diagnostics" value={genData.labName} onChange={e => setGenData({ ...genData, labName: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Contact Phone *</label>
              <input required className="input" placeholder="9876543210" value={genData.contactPhone} onChange={e => setGenData({ ...genData, contactPhone: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Tier</label>
              <select className="input" value={genData.tier} onChange={e => setGenData({ ...genData, tier: e.target.value })}>
                <option>Starter</option>
                <option>Pro</option>
                <option>Enterprise</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Validity (Days)</label>
              <input className="input" type="number" min="1" value={genData.validDays} onChange={e => setGenData({ ...genData, validDays: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: 42 }} disabled={generating}>
              {generating ? "Signing..." : "Generate"}
            </button>
          </form>

          {/* Generated Token Display */}
          {generatedToken && (
            <div style={{ marginTop: 24, padding: 20, background: "var(--bg)", border: "2px solid #10b981", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <CheckCircle size={18} color="#10b981" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>License Token Generated Successfully!</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                Generated for <b>{genData.labName}</b> ({genData.tier} Tier, valid for {genData.validDays} days):
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px dashed var(--border)" }}>
                <code style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--primary)", wordBreak: "break-all", lineHeight: 1.6 }}>{generatedToken}</code>
                <button className="btn btn-secondary" style={{ whiteSpace: "nowrap" }} onClick={() => handleCopy(generatedToken)}>
                  <Copy size={14} /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#fefce8", borderRadius: 8, border: "1px solid #fde68a" }}>
                <ShieldAlert size={16} color="#d97706" />
                <span><b>Instructions:</b> Send this token to the lab. They should open Desktop App ➔ Settings ➔ Paste this token in the License Key field ➔ Click Activate.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Licenses Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Loading licenses...</div>
        ) : licenses.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            <Key size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No licenses generated yet</div>
            <div>Click "Generate License Key" to create your first license.</div>
          </div>
        ) : (
          <table style={{ width: "100%", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "16px 24px" }}>Lab ID</th>
                <th style={{ padding: "16px 24px" }}>Lab Name</th>
                <th style={{ padding: "16px 24px" }}>Phone</th>
                <th style={{ padding: "16px 24px" }}>Tier</th>
                <th style={{ padding: "16px 24px" }}>Status</th>
                <th style={{ padding: "16px 24px" }}>Issued</th>
                <th style={{ padding: "16px 24px" }}>Expiry</th>
                <th style={{ padding: "16px 24px" }}>Devices</th>
                <th style={{ padding: "16px 24px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic, i) => (
                <tr key={lic.id} style={{ borderBottom: i === licenses.length - 1 ? "none" : "1px solid var(--border)" }}>
                  <td style={{ padding: "16px 24px", color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>{lic.id}</td>
                  <td style={{ padding: "16px 24px", fontWeight: 600 }}>{lic.labName}</td>
                  <td style={{ padding: "16px 24px", color: "var(--muted)" }}>{lic.contactPhone}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span style={{ background: "var(--bg)", padding: "4px 10px", borderRadius: 4, color: "var(--primary)", fontSize: 12, fontWeight: 600 }}>
                      {lic.tier}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    {lic.status === "active" && !isExpired(lic.validUntil) ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981" }}>
                        <CheckCircle size={14} /> Active
                      </div>
                    ) : lic.status === "revoked" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444" }}>
                        <ShieldAlert size={14} /> Revoked
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b" }}>
                        <ShieldAlert size={14} /> Expired
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "16px 24px", color: "var(--muted)", fontSize: 12 }}>{fmtDate(lic.issuedAt)}</td>
                  <td style={{ padding: "16px 24px", color: isExpired(lic.validUntil) ? "#ef4444" : "var(--muted)", fontSize: 12 }}>{fmtDate(lic.validUntil)}</td>
                  <td style={{ padding: "16px 24px", textAlign: "center" }}>{lic.devices?.length ?? 0}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        title="Copy License Token"
                        style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--primary)" }}
                        onClick={() => handleCopy(lic.token)}
                      >
                        <Copy size={14} />
                      </button>
                      {lic.status === "active" && (
                        <button
                          title="Revoke License"
                          style={{ background: "none", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#ef4444" }}
                          onClick={() => handleRevoke(lic.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
