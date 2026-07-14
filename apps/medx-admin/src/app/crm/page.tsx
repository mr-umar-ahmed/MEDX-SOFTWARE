"use client";

import { useState } from "react";
import { Plus, Phone, Mail, MoreVertical } from "lucide-react";

export default function CRMPage() {
  const [leads, setLeads] = useState([
    { id: 1, name: "City Path Labs", contact: "Dr. Sharma", phone: "9876543210", email: "sharma@city.com", status: "New", value: "$500/mo" },
    { id: 2, name: "Metro Diagnostics", contact: "Ravi Kumar", phone: "9876543211", email: "ravi@metro.com", status: "Contacted", value: "$300/mo" },
    { id: 3, name: "Sunrise Health", contact: "Anita Singh", phone: "9876543212", email: "anita@sunrise.com", status: "Demo Scheduled", value: "$1000/mo" },
    { id: 4, name: "Care Point", contact: "Dr. Ali", phone: "9876543213", email: "ali@carepoint.com", status: "Closed Won", value: "$500/mo" }
  ]);

  const stages = ["New", "Contacted", "Demo Scheduled", "Closed Won"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Sales CRM</h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0 0" }}>Manage your inbound software leads and demos.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Plus size={18} /> Add Lead
        </button>
      </div>

      <div style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 16 }}>
        {stages.map(stage => (
          <div key={stage} style={{ flex: 1, minWidth: 280, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{stage}</h3>
              <span style={{ background: "var(--bg)", color: "var(--muted)", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>
                {leads.filter(l => l.status === stage).length}
              </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {leads.filter(l => l.status === stage).map(lead => (
                <div key={lead.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, cursor: "pointer" }} className="hover-border">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{lead.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{lead.contact}</div>
                    </div>
                    <MoreVertical size={16} color="var(--muted)" />
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {lead.phone}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={12} /> {lead.email}</div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{lead.value}</span>
                    <button style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, cursor: "pointer" }}>Move ➔</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hover-border:hover { border-color: var(--primary) !important; }
      `}} />
    </div>
  );
}
