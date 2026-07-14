"use client";

import { useState, useEffect } from "react";
import { CheckCircle, CalendarPlus, ShieldCheck } from "lucide-react";
import { getSyncedLabs } from "../portal/actions";

interface LabItem {
  id: string;
  name: string;
  location: string;
  city: string;
  phone: string;
  email: string;
  synced: boolean;
}

export default function BookingPage() {
  const [labs, setLabs] = useState<LabItem[]>([]);
  const [selectedLab, setSelectedLab] = useState("");
  const [labSearch, setLabSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    age: "",
    address: "",
    date: "",
    timeSlot: "07:00 AM - 09:00 AM",
    tests: "",
  });

  useEffect(() => {
    async function fetchLabs() {
      try {
        const data = await getSyncedLabs();
        setLabs(data);
      } catch (e) {
        console.error("Failed to fetch labs", e);
      } finally {
        setLoading(false);
      }
    }
    fetchLabs();
  }, []);

  const filteredLabs = labs.filter((lab) =>
    lab.name.toLowerCase().includes(labSearch.toLowerCase()) ||
    lab.location.toLowerCase().includes(labSearch.toLowerCase())
  );

  function handleSelectLab(lab: LabItem) {
    setSelectedLab(lab.name);
    setLabSearch(lab.name + " (" + lab.location + ")");
    setShowDropdown(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLab) {
      alert("Please select a diagnostic laboratory.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main>
        <div className="container" style={{ padding: "40px 20px" }}>
          <div className="card text-center" style={{ padding: 40 }}>
            <div style={{ display: "inline-flex", width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", color: "#16803d", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <CheckCircle size={36} />
            </div>
            <h1 className="section-title" style={{ fontSize: 24, marginBottom: 8 }}>Booking Requested!</h1>
            <p className="text-muted" style={{ fontSize: 15, marginBottom: 24 }}>
              Your home collection request has been submitted to <b>{selectedLab}</b>. The phlebotomist will contact you shortly on <b>{formData.phone}</b> to confirm details.
            </p>
            <button className="btn btn-primary" onClick={() => { setSubmitted(false); setSelectedLab(""); setLabSearch(""); setFormData({ name: "", phone: "", age: "", address: "", date: "", timeSlot: "07:00 AM - 09:00 AM", tests: "" }); }}>
              Book Another Collection
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="container">
        <div className="page-header">
          <h1>Home Sample Collection</h1>
          <p>Book a qualified phlebotomist to collect blood/urine samples from your home.</p>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Loading registered laboratories...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Lab Selector with Search */}
              <div className="form-group" style={{ position: "relative" }}>
                <label className="form-label">Select Diagnostic Laboratory *</label>
                <input
                  required
                  type="text"
                  className="input"
                  placeholder="Type to search active labs..."
                  value={labSearch}
                  onChange={(e) => {
                    setLabSearch(e.target.value);
                    setShowDropdown(true);
                    if (selectedLab) setSelectedLab("");
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                {showDropdown && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", zIndex: 10, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                    {filteredLabs.length === 0 ? (
                      <div style={{ padding: 12, color: "var(--muted)", fontSize: 14 }}>No registered laboratories found.</div>
                    ) : (
                      filteredLabs.map((lab) => (
                        <div
                          key={lab.id}
                          style={{ padding: "12px 16px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid var(--border)" }}
                          onMouseDown={() => handleSelectLab(lab)}
                          className="dropdown-item-hover"
                        >
                          <div style={{ fontWeight: 600 }}>{lab.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{lab.location}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input required type="text" className="input" placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input required type="tel" className="input" placeholder="e.g. +91 98765 43210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input required type="text" className="input" placeholder="e.g. 45" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Complete Home Address *</label>
                <textarea required className="input" rows={3} placeholder="Flat/House No, Building name, Landmark, Area, Pincode" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ resize: "none" }}></textarea>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Preferred Date *</label>
                  <input required type="date" className="input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Time Slot *</label>
                  <select className="input" value={formData.timeSlot} onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}>
                    <option>07:00 AM - 09:00 AM</option>
                    <option>09:00 AM - 11:00 AM</option>
                    <option>11:00 AM - 01:00 PM</option>
                    <option>04:00 PM - 06:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tests Required (Optional)</label>
                <input type="text" className="input" placeholder="e.g. CBC, Thyroid Profile, Lipid Profile" value={formData.tests} onChange={e => setFormData({ ...formData, tests: e.target.value })} />
              </div>

              <div className="alert alert-info" style={{ marginTop: 24, marginBottom: 24 }}>
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>Our phlebotomists follow 100% sterile safety protocols and use disposable gloves and single-use vacutainers.</div>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Request Sample Collection
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
