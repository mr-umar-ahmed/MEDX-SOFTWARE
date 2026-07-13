"use client";

import { useState, useEffect } from "react";

interface LicenseRecord {
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

export default function AdminDashboard() {
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [labName, setLabName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [tier, setTier] = useState<"Starter" | "Pro" | "Enterprise">("Pro");
  const [validDays, setValidDays] = useState("365");
  const [generatedKey, setGeneratedKey] = useState<LicenseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLicenses();
  }, []);

  async function fetchLicenses() {
    try {
      const res = await fetch("/api/licenses");
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses);
      }
    } catch (err) {
      console.error("Failed to load licenses", err);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!labName.trim() || !contactPhone.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labName, contactPhone, tier, validDays }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedKey(data.license);
        setLabName("");
        setContactPhone("");
        fetchLicenses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm(`Are you sure you want to revoke license ${id}?`)) return;

    try {
      const res = await fetch("/api/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        if (generatedKey?.id === id) {
          setGeneratedKey(null);
        }
        fetchLicenses();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleCopy(token: string, id: string) {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-teal-500/20">
              M
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              MedX <span className="text-teal-400 font-normal">Admin Panel</span>
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono bg-slate-900 border border-slate-800 rounded px-2.5 py-1">
            v0.2.0 · Local Mode
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Generator Form */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🔑 Generate License Key
            </h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Lab Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nagpur Metro Pathology Lab"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    License Tier
                  </label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Validity Period
                  </label>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="365">1 Year</option>
                    <option value="1825">5 Years</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm shadow-lg shadow-teal-500/20 hover:from-teal-400 hover:to-emerald-500 transition disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Key"}
              </button>
            </form>
          </div>

          {/* Generated Result Modal-Card */}
          {generatedKey && (
            <div className="bg-teal-950/20 border border-teal-500/30 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-teal-400 text-base">Key Generated successfully!</h3>
                  <div className="text-xs text-slate-400 mt-0.5">Copy the token block and paste in MedX settings.</div>
                </div>
                <button
                  onClick={() => setGeneratedKey(null)}
                  className="text-slate-400 hover:text-slate-200 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-xs uppercase text-slate-500 font-bold">License Key</div>
                <div className="text-xl font-black text-white font-mono mt-1 select-all">
                  {generatedKey.id}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">License Token Block</div>
                <textarea
                  readOnly
                  value={generatedKey.token}
                  className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-teal-300 resize-none select-all focus:outline-none"
                />
              </div>
              <button
                onClick={() => handleCopy(generatedKey.token, generatedKey.id)}
                className="w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-bold py-2 rounded-lg text-sm transition"
              >
                {copiedId === generatedKey.id ? "✓ Copied to clipboard" : "📋 Copy Token"}
              </button>
            </div>
          )}
        </div>

        {/* Issued Keys Table */}
        <div className="md:col-span-2">
          <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                📋 Issued Licenses ({licenses.length})
              </h2>
              <button onClick={fetchLicenses} className="text-xs text-teal-400 hover:text-teal-300 font-semibold">
                ↻ Refresh List
              </button>
            </div>
            {licenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No licenses generated yet. Use the key generator on the left to issue one.
              </div>
            ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold uppercase text-slate-500 bg-slate-900/50">
                      <th className="px-6 py-3">Lab Name &amp; Phone</th>
                      <th className="px-6 py-3">Tier</th>
                      <th className="px-6 py-3">Connected Devices</th>
                      <th className="px-6 py-3">Expiry</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {licenses.map((l) => {
                      const deviceLimits = { Starter: 1, Pro: 3, Enterprise: "∞" };
                      const limit = deviceLimits[l.tier] || 1;
                      const connectedCount = l.devices?.length || 0;

                      return (
                        <tr key={l.id} className="hover:bg-slate-900/20 text-sm">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{l.labName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{l.contactPhone} · Key: <span className="font-mono">{l.id}</span></div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                l.tier === "Enterprise"
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : l.tier === "Pro"
                                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                  : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                              }`}
                            >
                                {l.tier}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-200 text-xs">
                              {connectedCount} / {limit} Devices
                            </div>
                            {l.devices && l.devices.length > 0 ? (
                              <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                                {l.devices.map((d, i) => (
                                  <div key={i} className="flex items-center gap-1.5 font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                    <span>{d.hostname}</span>
                                    <span className="text-[10px] text-slate-500">
                                      ({new Date(d.lastSeenAt).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" })})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-600 font-mono mt-0.5">No devices registered</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-300 font-mono">
                            {new Date(l.validUntil).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${
                                l.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                              }`}
                              title={l.status}
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center gap-3 justify-end">
                              <button
                                onClick={() => handleCopy(l.token, l.id)}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                {copiedId === l.id ? "Copied" : "Copy Token"}
                              </button>
                              {l.status === "active" && (
                                <button
                                  onClick={() => handleRevoke(l.id)}
                                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
