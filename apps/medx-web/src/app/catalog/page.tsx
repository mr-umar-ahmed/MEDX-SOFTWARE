"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, MapPin, RefreshCw } from "lucide-react";
import { getSyncedLabs } from "../portal/actions";

interface LabItem {
  id: string;
  name: string;
  location: string;
  city: string;
  phone: string;
  email: string;
  catalog: Array<{ name: string; code: string; price: number; category: string }>;
  synced: boolean;
}

const DEFAULT_TESTS = [
  { name: "Complete Blood Count (CBC)", code: "CBC", price: 300, category: "Haematology" },
  { name: "Liver Function Test (LFT)", code: "LFT", price: 600, category: "Biochemistry" },
  { name: "Kidney Function Test (KFT)", code: "KFT", price: 550, category: "Biochemistry" },
  { name: "Lipid Profile", code: "LIPID", price: 500, category: "Biochemistry" },
  { name: "Thyroid Profile (T3/T4/TSH)", code: "THYROID", price: 700, category: "Immunoassay" },
  { name: "ESR", code: "ESR", price: 150, category: "Haematology" },
  { name: "Blood Sugar Fasting (FBS)", code: "FBS", price: 80, category: "Diabetes" },
  { name: "HBA1c", code: "HBA1C", price: 400, category: "Diabetes" }
];

export default function CatalogPage() {
  const [labs, setLabs] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [labSearch, setLabSearch] = useState("");
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [testSearch, setTestSearch] = useState("");

  useEffect(() => {
    fetchLabs();
  }, []);

  async function fetchLabs() {
    setLoading(true);
    try {
      const data = await getSyncedLabs();
      setLabs(data);
    } catch (e) {
      console.error("Failed to load labs", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredLabs = useMemo(() => {
    const q = labSearch.trim().toLowerCase();
    if (!q) return labs;
    return labs.filter(l => l.name.toLowerCase().includes(q) || l.location.toLowerCase().includes(q));
  }, [labs, labSearch]);

  const selectedLab = labs.find(l => l.id === selectedLabId);
  const tests = selectedLab ? (selectedLab.catalog.length > 0 ? selectedLab.catalog : DEFAULT_TESTS) : [];
  
  const filteredTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }, [tests, testSearch]);

  return (
    <main>
      <div className="container">
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1>Tests & Pricing</h1>
            <p>Select an active, registered diagnostic lab below to check their test prices.</p>
          </div>
          {!selectedLabId && (
            <button className="btn btn-secondary btn-sm" onClick={fetchLabs} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Loading registered laboratories...</div>
        ) : !selectedLabId ? (
          <>
            <div className="search-wrap">
              <Search size={18} />
              <input className="input" placeholder="Search lab by name or city..." value={labSearch} onChange={e => setLabSearch(e.target.value)} />
            </div>

            {filteredLabs.length === 0 ? (
              <div className="empty-state">
                <Search size={48} />
                <h3>No registered labs found</h3>
                <p>Verify that the lab has been active in the SaaS Admin Panel.</p>
              </div>
            ) : (
              <div>
                {filteredLabs.map(lab => (
                  <div key={lab.id} className="lab-card" onClick={() => setSelectedLabId(lab.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4>{lab.name}</h4>
                        <div className="loc"><MapPin size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {lab.location}</div>
                      </div>
                      <span className={`chip ${lab.synced ? "chip-ok" : "chip-warn"}`} style={{ fontSize: 10 }}>
                        {lab.synced ? "Synced" : "Awaiting Setup"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected Lab Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedLab?.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}><MapPin size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {selectedLab?.location}</div>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedLabId(null); setTestSearch(""); }}>
                ← Change Lab
              </button>
            </div>

            {/* Test Search */}
            <div className="search-wrap">
              <Search size={18} />
              <input className="input" placeholder="Search test catalog (e.g. CBC, Lipid)..." value={testSearch} onChange={e => setTestSearch(e.target.value)} />
            </div>

            {/* Price Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="price-table" style={{ padding: "0 16px" }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 16 }}>Test Name</th>
                    <th style={{ textAlign: "right", paddingRight: 16 }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map(test => (
                    <tr key={test.code}>
                      <td style={{ paddingLeft: 16 }}>
                        <div style={{ fontWeight: 600 }}>{test.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{test.category}</div>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: 16 }} className="price">₹{test.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTests.length === 0 && (
                <div className="empty-state"><p>No tests match your search.</p></div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
