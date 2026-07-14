import { TrendingUp, Users, AlertCircle, CheckCircle } from "lucide-react";
import { getLicenses, getTickets } from "@/lib/adminDb";

export const revalidate = 5; // Keep data fresh (every 5 seconds)

export default async function DashboardPage() {
  const licenses = await getLicenses();
  const tickets = await getTickets();

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Filter active and non-expired licenses
  const activeLicenses = licenses.filter(
    (l) => l.status === "active" && new Date(l.validUntil) > now
  );

  // Compute MRR dynamically based on active subscription tiers
  const mrr = activeLicenses.reduce((sum, l) => {
    if (l.tier === "Pro") return sum + 150;
    if (l.tier === "Enterprise") return sum + 450;
    return sum; // Starter is free
  }, 0);

  // Expiring licenses within 30 days
  const expiringCount = activeLicenses.filter((l) => {
    const exp = new Date(l.validUntil);
    return exp > now && exp <= thirtyDaysFromNow;
  }).length;

  // Recent Deployments (last 5 licenses created)
  const recentDeployments = licenses.slice(0, 5);

  // Pending Support Tickets (Open or In Progress)
  const pendingTickets = tickets
    .filter((t) => t.status === "Open" || t.status === "In Progress")
    .slice(0, 5);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Global Overview</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>Welcome to the MedX Super Admin ERP. Here is your SaaS bird's-eye view.</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, marginBottom: 40 }}>
        
        {/* MRR Card */}
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Monthly Recurring Revenue</h3>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>${mrr.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: "#10b981", marginTop: 8 }}>Based on active Pro & Enterprise plans</div>
        </div>

        {/* Active Deployments Card */}
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Active Deployments</h3>
            <Users size={20} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>{activeLicenses.length} Labs</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Total generated: {licenses.length}</div>
        </div>

        {/* Expiring Licenses Card */}
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Expiring Licenses (30d)</h3>
            <AlertCircle size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>{expiringCount}</div>
          <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>
            {expiringCount > 0 ? "Renewal follow-up required" : "All licenses up to date"}
          </div>
        </div>
        
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        
        {/* Recent Deployments Table */}
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Recent Deployments</h2>
          {recentDeployments.length === 0 ? (
            <div style={{ color: "var(--muted)", padding: "24px 0" }}>No lab deployments registered yet. Go to Deployed Labs to generate keys.</div>
          ) : (
            <table style={{ width: "100%", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ paddingBottom: 12 }}>Lab Name</th>
                  <th style={{ paddingBottom: 12 }}>Tier</th>
                  <th style={{ paddingBottom: 12 }}>Status</th>
                  <th style={{ paddingBottom: 12 }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentDeployments.map((lab) => {
                  const isExpired = new Date(lab.validUntil) < now;
                  return (
                    <tr key={lab.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "16px 0", fontWeight: 600 }}>{lab.labName}</td>
                      <td style={{ padding: "16px 0" }}>
                        <span style={{ background: "var(--bg)", padding: "4px 8px", borderRadius: 4, color: "var(--primary)", fontSize: 12, fontWeight: 600 }}>
                          {lab.tier}
                        </span>
                      </td>
                      <td style={{ padding: "16px 0" }}>
                        {lab.status === "active" && !isExpired ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981" }}>
                            <CheckCircle size={14} /> Active
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444" }}>
                            <AlertCircle size={14} /> {lab.status === "revoked" ? "Revoked" : "Expired"}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 0", color: "var(--muted)" }}>{fmtDate(lab.issuedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Support Tickets Panel */}
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Pending Support Tickets</h2>
          {pendingTickets.length === 0 ? (
            <div style={{ color: "var(--muted)", padding: "24px 0", textAlign: "center" }}>
              <CheckCircle size={32} color="#10b981" style={{ marginBottom: 12, opacity: 0.7 }} />
              <div>All support tickets resolved!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {pendingTickets.map((ticket) => (
                <div key={ticket.id} style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{ticket.subject}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: ticket.priority === "Critical" || ticket.priority === "High" ? "#ef4444" : "#f59e0b",
                      background: ticket.priority === "Critical" || ticket.priority === "High" ? "#fee2e2" : "#fef3c7",
                      padding: "2px 6px",
                      borderRadius: 4
                    }}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{ticket.customerName}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
