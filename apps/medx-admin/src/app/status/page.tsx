"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Database, Globe, Server, RefreshCw, CheckCircle, XCircle, MessageSquare } from "lucide-react";

interface Check {
  ok: boolean;
  latencyMs: number;
  detail?: string;
}

interface LabStatus {
  id: string;
  labName: string;
  tier: string;
  status: string;
  validUntil: string;
  devices: number;
  lastHeartbeatAt: string | null;
  lastSyncedAt: string | null;
  syncedPatients: number;
  syncedOrders: number;
  pendingBookings: number;
  adminMessage: string | null;
}

interface StatusData {
  success: boolean;
  time: string;
  checks: Record<string, Check>;
  labs: LabStatus[];
}

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function freshnessColor(iso: string | null, staleAfterHours: number): string {
  if (!iso) return "var(--muted)";
  const ageHours = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (ageHours <= staleAfterHours) return "#10b981";
  if (ageHours <= staleAfterHours * 4) return "#f59e0b";
  return "#ef4444";
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/status");
      const json = await res.json();
      if (json.success) setData(json);
      else setError(json.error || "Status check failed.");
    } catch {
      setError("Could not reach the admin API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const platformCards = [
    {
      key: "adminApi",
      name: "Admin Panel API",
      icon: <Server size={22} />,
      check: data ? { ok: true, latencyMs: 0 } : null,
      sub: "This dashboard + licensing/heartbeat APIs",
    },
    {
      key: "blobStore",
      name: "Cloud Database (Blob Store)",
      icon: <Database size={22} />,
      check: data?.checks?.blobStore ?? null,
      sub: "Licenses, CRM, portal sync & bookings storage",
    },
    {
      key: "patientWebsite",
      name: "Patient Website (medx-web)",
      icon: <Globe size={22} />,
      check: data?.checks?.patientWebsite ?? null,
      sub: "Portal, booking & report delivery site",
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <Activity size={30} color="var(--primary)" /> Platform Status
          </h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0 0" }}>
            Live health of all three platforms and every deployed lab&apos;s connectivity.
          </p>
        </div>
        <button className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={load} disabled={loading}>
          <RefreshCw size={16} /> {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 12, marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Platform cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {platformCards.map((c) => (
          <div key={c.key} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                {c.icon} {c.name}
              </div>
              {c.check === null ? (
                <span style={{ color: "var(--muted)", fontSize: 12 }}>…</span>
              ) : c.check.ok ? (
                <CheckCircle size={20} color="#10b981" />
              ) : (
                <XCircle size={20} color="#ef4444" />
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.sub}</div>
            {c.check && c.key !== "adminApi" && (
              <div style={{ fontSize: 12, marginTop: 8, color: c.check.ok ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                {c.check.ok ? "Operational" : "DOWN"} · {c.check.latencyMs}ms
                {c.check.detail ? ` · ${c.check.detail}` : ""}
              </div>
            )}
            {c.key === "adminApi" && data && (
              <div style={{ fontSize: 12, marginTop: 8, color: "#10b981", fontWeight: 600 }}>Operational</div>
            )}
          </div>
        ))}
      </div>

      {/* Per-lab connectivity */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
          Deployed Lab Connectivity ({data?.labs?.length ?? 0})
        </div>
        {!data ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading…</div>
        ) : data.labs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No labs deployed yet.</div>
        ) : (
          <table style={{ width: "100%", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "12px 20px" }}>Lab</th>
                <th style={{ padding: "12px 20px" }}>Tier</th>
                <th style={{ padding: "12px 20px" }}>License</th>
                <th style={{ padding: "12px 20px" }}>Devices</th>
                <th style={{ padding: "12px 20px" }}>Last Heartbeat</th>
                <th style={{ padding: "12px 20px" }}>Last Portal Sync</th>
                <th style={{ padding: "12px 20px" }}>Synced Data</th>
                <th style={{ padding: "12px 20px" }}>Pending Bookings</th>
              </tr>
            </thead>
            <tbody>
              {data.labs.map((lab, i) => (
                <tr key={lab.id} style={{ borderBottom: i === data.labs.length - 1 ? "none" : "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {lab.labName}
                      {lab.adminMessage && (
                        <span title={`Active message: ${lab.adminMessage}`}>
                          <MessageSquare size={13} color="#f59e0b" />
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>{lab.id}</div>
                  </td>
                  <td style={{ padding: "12px 20px" }}>{lab.tier}</td>
                  <td style={{ padding: "12px 20px" }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: 12,
                      color: lab.status === "active" ? "#10b981" : lab.status === "expired" ? "#f59e0b" : "#ef4444",
                    }}>
                      {lab.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "center" }}>{lab.devices}</td>
                  <td style={{ padding: "12px 20px", color: freshnessColor(lab.lastHeartbeatAt, 26), fontWeight: 600 }}>
                    {relTime(lab.lastHeartbeatAt)}
                  </td>
                  <td style={{ padding: "12px 20px", color: freshnessColor(lab.lastSyncedAt, 1), fontWeight: 600 }}>
                    {lab.tier === "Starter" ? <span style={{ color: "var(--muted)", fontWeight: 400 }}>n/a (offline plan)</span> : relTime(lab.lastSyncedAt)}
                  </td>
                  <td style={{ padding: "12px 20px", color: "var(--muted)" }}>
                    {lab.syncedPatients} patients · {lab.syncedOrders} orders
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "center" }}>
                    {lab.pendingBookings > 0 ? (
                      <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 10px", borderRadius: 99, fontWeight: 700, fontSize: 12 }}>
                        {lab.pendingBookings}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && (
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          Last checked {new Date(data.time).toLocaleTimeString()} · auto-refreshes every 30s
        </div>
      )}
    </div>
  );
}
