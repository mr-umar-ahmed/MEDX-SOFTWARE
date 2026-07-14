"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle, Clock, AlertCircle, Send, Check } from "lucide-react";

interface TicketMessage {
  at: string;
  text: string;
  sender: "Staff" | "Customer";
}

interface Ticket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved";
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // New reply state
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (e) {
      console.error("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    setSendingReply(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicketId,
          msgText: replyText.trim(),
          msgSender: "Staff",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        fetchTickets();
      }
    } catch (err) {
      alert("Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  }

  async function handleUpdateStatus(id: string, newStatus: Ticket["status"]) {
    try {
      const res = await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTickets();
      }
    } catch (err) {
      alert("Failed to update status.");
    }
  }

  const filteredTickets = tickets.filter((t) =>
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.customerName.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Helpdesk</h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0 0" }}>Resolve technical support tickets and communicate with active labs.</p>
        </div>
        
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ position: "relative", width: 280 }}>
            <Search size={16} color="var(--muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input className="input" placeholder="Search tickets..." style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={fetchTickets}>Refresh</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 24, minHeight: 600, alignItems: "stretch" }}>
        
        {/* Ticket List column */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Loading support tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>No tickets found matching criteria.</div>
          ) : (
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filteredTickets.map((ticket, i) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    padding: 20,
                    borderBottom: i === filteredTickets.length - 1 ? "none" : "1px solid var(--border)",
                    cursor: "pointer",
                    background: selectedTicketId === ticket.id ? "var(--bg)" : "transparent",
                    borderLeft: selectedTicketId === ticket.id ? "4px solid var(--primary)" : "none",
                  }}
                  className="hover-bg"
                >
                  <div style={{ marginRight: 16, marginTop: 2 }}>
                    {ticket.status === "Resolved" ? (
                      <CheckCircle size={20} color="#10b981" />
                    ) : (
                      <Clock size={20} color="#f59e0b" />
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{ticket.subject}</h3>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ color: "var(--primary)", fontWeight: 600 }}>{ticket.customerName}</span>
                      <span style={{ color: "var(--muted)" }}>{ticket.id}</span>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        color: ticket.priority === "Critical" || ticket.priority === "High" ? "#ef4444" : "#f59e0b",
                        background: ticket.priority === "Critical" || ticket.priority === "High" ? "#fee2e2" : "#fef3c7"
                      }}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ticket Chat & Actions column */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column" }}>
          {selectedTicket ? (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 24 }}>
              
              {/* Ticket header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{selectedTicket.id}</span>
                    <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>{selectedTicket.customerName}</span>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{selectedTicket.subject}</h2>
                </div>
                
                {/* Status selector */}
                <div>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4, fontWeight: 600 }}>TICKET STATUS</label>
                  <select
                    className="input"
                    style={{ height: 36, padding: "0 12px", minWidth: 130, fontSize: 12 }}
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value as any)}
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                  </select>
                </div>
              </div>

              {/* Chat Thread */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, marginBottom: 20, paddingRight: 6, maxHeight: 380 }}>
                
                {/* Original ticket issue */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "var(--muted)", fontSize: 11 }}>
                    <b>Initial Submission</b>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div>{selectedTicket.description}</div>
                </div>

                {/* Responses list */}
                {selectedTicket.messages?.map((msg, index) => {
                  const isStaff = msg.sender === "Staff";
                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isStaff ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "80%",
                          background: isStaff ? "var(--primary-light)" : "var(--surface-hover)",
                          border: isStaff ? "1px solid var(--primary)" : "1px solid var(--border)",
                          borderRadius: 12,
                          padding: 12,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 4, color: "var(--muted)", fontSize: 10 }}>
                          <b>{isStaff ? "Helpdesk Specialist" : selectedTicket.customerName}</b>
                          <span>{new Date(msg.at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply box */}
              <form onSubmit={handleSendReply} style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <input
                    required
                    className="input"
                    placeholder="Type technical response here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    style={{ flex: 1, height: 42 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ height: 42 }} disabled={sendingReply}>
                    <Send size={16} /> Send
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--muted)", padding: 48 }}>
              <AlertCircle size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <h3>No Ticket Selected</h3>
              <p>Select a ticket from the left panel to read log history and send replies.</p>
            </div>
          )}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hover-bg:hover { background: var(--surface-hover); }
      ` }} />
    </div>
  );
}
