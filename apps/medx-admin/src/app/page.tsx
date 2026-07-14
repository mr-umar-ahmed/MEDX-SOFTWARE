import { TrendingUp, Users, AlertCircle, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Global Overview</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>Welcome to the MedX Super Admin ERP. Here is your SaaS bird's-eye view.</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, marginBottom: 40 }}>
        
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Monthly Recurring Revenue</h3>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>$12,450</div>
          <div style={{ fontSize: 12, color: "#10b981", marginTop: 8 }}>+15% from last month</div>
        </div>

        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Active Deployments</h3>
            <Users size={20} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>42 Labs</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Across 12 regions</div>
        </div>

        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Expiring Licenses (30d)</h3>
            <AlertCircle size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>3</div>
          <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>Follow up required</div>
        </div>
        
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Recent Deployments</h2>
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
              {[
                { name: "City Diagnostics", tier: "Enterprise", date: "Oct 12, 2026" },
                { name: "Metro Labs", tier: "Pro", date: "Oct 10, 2026" },
                { name: "Sunrise Care", tier: "Starter", date: "Oct 05, 2026" }
              ].map((lab, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px 0", fontWeight: 600 }}>{lab.name}</td>
                  <td style={{ padding: "16px 0" }}>
                    <span style={{ background: "var(--bg)", padding: "4px 8px", borderRadius: 4, color: "var(--primary)", fontSize: 12 }}>{lab.tier}</span>
                  </td>
                  <td style={{ padding: "16px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981" }}>
                      <CheckCircle size={14} /> Active
                    </div>
                  </td>
                  <td style={{ padding: "16px 0", color: "var(--muted)" }}>{lab.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Pending Support Tickets</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { title: "Machine Interfacing Setup", lab: "Apollo Labs", priority: "High" },
              { title: "Cannot print reports", lab: "Care Diagnostics", priority: "Medium" }
            ].map((ticket, i) => (
              <div key={i} style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{ticket.title}</span>
                  <span style={{ fontSize: 12, color: ticket.priority === "High" ? "#ef4444" : "#f59e0b" }}>{ticket.priority}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{ticket.lab}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
