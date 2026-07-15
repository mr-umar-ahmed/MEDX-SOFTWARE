"use client";

import { useState, useEffect } from "react";
import { ScrollText, Search, RefreshCw } from "lucide-react";

interface AuditLog {
  timestamp: string;
  action: string;
  details: string;
  author: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.author.toLowerCase().includes(q)
    );
  });

  function getActionColor(action: string) {
    if (action.includes("create")) return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" };
    if (action.includes("revoke") || action.includes("delete")) return { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" };
    if (action.includes("extend")) return { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" };
    return { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" };
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <ScrollText size={32} color="var(--primary)" /> Operations Audit Trail
          </h1>
          <p style={{ color: "var(--muted)", margin: "4px 0 0 0" }}>
            Immutable records of license activations, extensions, and deactivations.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "10px 16px",
            borderRadius: 8,
            color: "var(--fg)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh Logs
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ position: "relative", marginBottom: 24 }}>
        <Search
          size={18}
          color="var(--muted)"
          style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          placeholder="Filter logs by action, details, license key, or operator..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "12px 16px 12px 48px",
            fontSize: 14,
            color: "var(--fg)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600 }}>Timestamp</th>
              <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600 }}>Action</th>
              <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600 }}>Operator</th>
              <th style={{ padding: "16px 24px", color: "var(--muted)", fontWeight: 600 }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
                  <RefreshCw className="spin" size={24} style={{ margin: "0 auto 8px auto" }} /> Loading system audit trail...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
                  No audit logs match your search filter criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const color = getActionColor(log.action);
                return (
                  <tr key={log.timestamp} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 24px", fontFamily: "monospace", color: "var(--muted)" }}>
                      {new Date(log.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span
                        style={{
                          background: color.bg,
                          color: color.text,
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", fontWeight: 600 }}>{log.author}</td>
                    <td style={{ padding: "16px 24px", color: "var(--fg)" }}>{log.details}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}
