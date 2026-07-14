"use client";

import { useState, useEffect } from "react";
import { Plus, Phone, MapPin, Trash2, ArrowRight, Save, User } from "lucide-react";

interface CustomerNote {
  at: string;
  text: string;
  author: string;
}

interface Customer {
  id: string;
  labName: string;
  contactPhone: string;
  location: string;
  gstin?: string;
  stage: "Lead" | "Trial" | "Active" | "Expired" | "Churned";
  notes: CustomerNote[];
  createdAt: string;
}

const STAGES: Array<Customer["stage"]> = ["Lead", "Trial", "Active", "Expired", "Churned"];

export default function CRMPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newData, setNewData] = useState({ labName: "", contactPhone: "", location: "", gstin: "" });
  const [adding, setAdding] = useState(false);

  // Notes state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error("Failed to load customer list.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newData.labName.trim() || !newData.contactPhone.trim() || !newData.location.trim()) return;
    setAdding(true);

    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddForm(false);
        setNewData({ labName: "", contactPhone: "", location: "", gstin: "" });
        fetchCustomers();
      } else {
        alert("Failed to add customer: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setAdding(false);
    }
  }

  async function handleMoveStage(id: string, currentStage: Customer["stage"]) {
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex === STAGES.length - 1) return; // reached the last stage
    const nextStage = STAGES[currentIndex + 1];

    try {
      const res = await fetch("/api/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stage: nextStage }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCustomers();
      }
    } catch (err) {
      alert("Failed to update status.");
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId || !noteText.trim()) return;
    setSavingNote(true);

    try {
      const res = await fetch("/api/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCustomerId,
          noteText: noteText.trim(),
          noteAuthor: "Super Admin User",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNoteText("");
        fetchCustomers();
      }
    } catch (e) {
      alert("Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Sales CRM</h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0 0" }}>Manage your SaaS pipeline and convert prospects to active accounts.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => setShowAddForm(true)}>
          <Plus size={18} /> Add Lead / Client
        </button>
      </div>

      {/* Add Lead Form Panel */}
      {showAddForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--primary)", borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>➕ Add New Lead / Client</h2>
            <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }} onClick={() => setShowAddForm(false)}>✕ Close</button>
          </div>

          <form onSubmit={handleAddLead} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr auto", gap: 16, alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Lab / Center Name *</label>
              <input required className="input" placeholder="e.g. Apex Labs" value={newData.labName} onChange={(e) => setNewData({ ...newData, labName: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Contact Phone *</label>
              <input required className="input" placeholder="9876543210" value={newData.contactPhone} onChange={(e) => setNewData({ ...newData, contactPhone: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>City / Location *</label>
              <input required className="input" placeholder="e.g. Nagpur - Dharampeth" value={newData.location} onChange={(e) => setNewData({ ...newData, location: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>GSTIN (Optional)</label>
              <input className="input" placeholder="GSTIN number" value={newData.gstin} onChange={(e) => setNewData({ ...newData, gstin: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: 42 }} disabled={adding}>
              {adding ? "Saving..." : "Add"}
            </button>
          </form>
        </div>
      )}

      {/* Main Kanban Board & Sidebar split */}
      <div style={{ display: "grid", gridTemplateColumns: selectedCustomerId ? "3fr 1.5fr" : "1fr", gap: 24, alignItems: "flex-start" }}>
        
        {/* Kanban Board columns */}
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", width: "100%" }}>Loading customer pipeline...</div>
          ) : (
            STAGES.map((stage) => {
              const stageLeads = customers.filter((c) => c.stage === stage);
              return (
                <div key={stage} style={{ flex: 1, minWidth: 260, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{stage}</h3>
                    <span style={{ background: "var(--bg)", color: "var(--primary)", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                      {stageLeads.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedCustomerId(lead.id)}
                        style={{
                          background: "var(--bg)",
                          border: selectedCustomerId === lead.id ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                          borderRadius: 10,
                          padding: 14,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        className="hover-border"
                      >
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{lead.labName}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                          <MapPin size={11} /> {lead.location}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
                          <Phone size={11} /> {lead.contactPhone}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>Notes: {lead.notes?.length ?? 0}</span>
                          {stage !== "Churned" && (
                            <button
                              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 11, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveStage(lead.id, lead.stage);
                              }}
                            >
                              Move <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Lead Details & Notes Sidebar */}
        {selectedCustomerId && selectedCustomer && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Client Detail</h3>
              <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14 }} onClick={() => setSelectedCustomerId(null)}>✕ Close</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, marginBottom: 24 }}>
              <div>
                <span style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>LAB NAME</span>
                <b>{selectedCustomer.labName}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>PHONE</span>
                <b>{selectedCustomer.contactPhone}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>LOCATION</span>
                <b>{selectedCustomer.location}</b>
              </div>
              {selectedCustomer.gstin && (
                <div>
                  <span style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>GSTIN</span>
                  <b>{selectedCustomer.gstin}</b>
                </div>
              )}
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Notes & Demos History</h4>
            
            {/* Notes List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 200, overflowY: "auto", marginBottom: 16, paddingRight: 6 }}>
              {selectedCustomer.notes.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No notes added yet. Record call notes or demo setups here.</div>
              ) : (
                selectedCustomer.notes.map((note, index) => (
                  <div key={index} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "var(--muted)", fontSize: 10 }}>
                      <span>{note.author}</span>
                      <span>{new Date(note.at).toLocaleDateString()}</span>
                    </div>
                    <div>{note.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Note Input */}
            <form onSubmit={handleAddNote}>
              <textarea
                required
                className="input"
                rows={2}
                placeholder="Add call note or next step..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{ fontSize: 12, resize: "none", marginBottom: 10 }}
              />
              <button type="submit" className="btn btn-primary btn-block btn-sm" disabled={savingNote}>
                <Save size={14} /> {savingNote ? "Saving..." : "Add Note"}
              </button>
            </form>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hover-border:hover { border-color: var(--primary) !important; }
      ` }} />
    </div>
  );
}
