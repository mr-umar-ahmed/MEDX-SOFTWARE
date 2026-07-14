"use client";

import { Ticket, Search, CheckCircle, Clock } from "lucide-react";

export default function SupportPage() {
  const tickets = [
    { id: "T-1042", lab: "Apollo Labs", title: "Machine Interfacing Setup for Sysmex", status: "Open", time: "2 hours ago", priority: "High" },
    { id: "T-1041", lab: "Care Diagnostics", title: "Cannot print reports after update", status: "Open", time: "5 hours ago", priority: "Medium" },
    { id: "T-1040", lab: "Metro Labs", title: "How to add a new doctor?", status: "Resolved", time: "1 day ago", priority: "Low" },
    { id: "T-1039", lab: "City Diagnostics", title: "Billing format adjustment", status: "Resolved", time: "2 days ago", priority: "Medium" }
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Helpdesk</h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0 0" }}>Resolve technical support tickets from deployed labs.</p>
        </div>
        
        <div className="form-group" style={{ margin: 0, width: 300 }}>
          <div style={{ position: "relative" }}>
            <Search size={16} color="var(--muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input className="input" placeholder="Search tickets..." style={{ paddingLeft: 36 }} />
          </div>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {tickets.map((ticket, i) => (
          <div key={ticket.id} style={{ display: "flex", alignItems: "flex-start", padding: 24, borderBottom: i === tickets.length - 1 ? "none" : "1px solid var(--border)", cursor: "pointer" }} className="hover-bg">
            <div style={{ marginRight: 24, marginTop: 4 }}>
              {ticket.status === "Open" ? <Clock size={24} color="#f59e0b" /> : <CheckCircle size={24} color="#10b981" />}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{ticket.title}</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{ticket.time}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>{ticket.lab}</span>
                <span style={{ color: "var(--muted)" }}>ID: {ticket.id}</span>
                <span style={{ background: "var(--bg)", padding: "2px 8px", borderRadius: 4, fontSize: 12, color: ticket.priority === "High" ? "#ef4444" : "var(--muted)" }}>
                  {ticket.priority} Priority
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hover-bg:hover { background: var(--bg); }
      `}} />
    </div>
  );
}
