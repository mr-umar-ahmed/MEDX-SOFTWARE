"use client";

import React, { useState, useEffect } from "react";

interface LicenseRecord {
  id: string;
  token: string;
  labName: string;
  contactPhone: string;
  tier: "Starter" | "Pro" | "Enterprise";
  issuedAt: string;
  validUntil: string;
  status: "active" | "revoked";
  devices?: Array<{ deviceId: string; hostname: string; lastSeenAt: string }>;
}

interface CustomerNote {
  at: string;
  text: string;
  author: string;
}

interface CustomerRecord {
  id: string;
  labName: string;
  contactPhone: string;
  location: string;
  gstin?: string;
  stage: "Lead" | "Trial" | "Active" | "Expired" | "Churned";
  notes: CustomerNote[];
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  amountPaidPaise: number;
  mode: "UPI" | "Bank Transfer" | "Card" | "Cash";
  referenceNo?: string;
  issuedAt: string;
  description?: string;
}

interface TicketMessage {
  at: string;
  text: string;
  sender: "Staff" | "Customer";
}

interface TicketRecord {
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

interface AppConfig {
  allowAbdm: boolean;
  allowWhatsApp: boolean;
  allowSms: boolean;
  maintenanceMode: boolean;
}

type TabType = "overview" | "licenses" | "crm" | "billing" | "tickets" | "config";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Global State
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    allowAbdm: true,
    allowWhatsApp: true,
    allowSms: true,
    maintenanceMode: false,
  });

  // State loading indicators
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states - Licenses
  const [licenseForm, setLicenseForm] = useState({
    labName: "",
    contactPhone: "",
    tier: "Pro" as "Starter" | "Pro" | "Enterprise",
    validDays: "365",
  });
  const [generatedKey, setGeneratedKey] = useState<LicenseRecord | null>(null);

  // Form states - CRM
  const [crmForm, setCrmForm] = useState({
    labName: "",
    contactPhone: "",
    location: "",
    gstin: "",
  });
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [newNote, setNewNote] = useState("");

  // Form states - Billing
  const [billingForm, setBillingForm] = useState({
    customerId: "",
    amountPaidRupees: "",
    mode: "UPI" as PaymentRecord["mode"],
    referenceNo: "",
    description: "",
  });

  // Form states - Tickets
  const [ticketForm, setTicketForm] = useState({
    customerId: "",
    subject: "",
    description: "",
    priority: "Medium" as TicketRecord["priority"],
  });
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [newTicketMsg, setNewTicketMsg] = useState("");

  // Fetch all state lists from APIs
  useEffect(() => {
    fetchLicenses();
    fetchCRMData();
    fetchBillingData();
    fetchTicketsData();
    fetchConfig();
  }, []);

  async function fetchLicenses() {
    try {
      const res = await fetch("/api/licenses");
      const d = await res.json();
      if (d.success) setLicenses(d.licenses);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchCRMData() {
    try {
      const res = await fetch("/api/crm");
      const d = await res.json();
      if (d.success) setCustomers(d.customers);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchBillingData() {
    try {
      const res = await fetch("/api/billing");
      const d = await res.json();
      if (d.success) setPayments(d.payments);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchTicketsData() {
    try {
      const res = await fetch("/api/tickets");
      const d = await res.json();
      if (d.success) setTickets(d.tickets);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchConfig() {
    try {
      const res = await fetch("/api/config");
      const d = await res.json();
      if (d.success) setAppConfig(d.config);
    } catch (e) {
      console.error(e);
    }
  }

  // Action: Create License
  async function handleCreateLicense(e: React.FormEvent) {
    e.preventDefault();
    if (!licenseForm.labName.trim() || !licenseForm.contactPhone.trim()) return;
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(licenseForm),
      });
      const d = await res.json();
      if (d.success) {
        setGeneratedKey(d.license);
        setLicenseForm({ labName: "", contactPhone: "", tier: "Pro", validDays: "365" });
        fetchLicenses();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Action: Revoke License
  async function handleRevokeLicense(id: string) {
    if (!confirm(`Revoke license key ${id}?`)) return;
    try {
      const res = await fetch("/api/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (d.success) {
        if (generatedKey?.id === id) setGeneratedKey(null);
        fetchLicenses();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Action: Create Customer CRM
  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!crmForm.labName.trim() || !crmForm.contactPhone.trim()) return;
    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crmForm),
      });
      const d = await res.json();
      if (d.success) {
        setCrmForm({ labName: "", contactPhone: "", location: "", gstin: "" });
        fetchCRMData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Action: Update Customer Stage
  async function handleUpdateStage(id: string, stage: CustomerRecord["stage"]) {
    try {
      const res = await fetch("/api/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stage }),
      });
      const d = await res.json();
      if (d.success) {
        fetchCRMData();
        if (selectedCustomer?.id === id) {
          setSelectedCustomer(d.customer);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Action: Add Customer note
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !newNote.trim()) return;
    try {
      const res = await fetch("/api/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCustomer.id,
          noteText: newNote.trim(),
          noteAuthor: "Administrator Staff",
        }),
      });
      const d = await res.json();
      if (d.success) {
        setNewNote("");
        setSelectedCustomer(d.customer);
        fetchCRMData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Action: Create Payment Receipt ERP
  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    const { customerId, amountPaidRupees, mode, referenceNo, description } = billingForm;
    if (!customerId || !amountPaidRupees) return;
    const amountPaidPaise = Math.round(parseFloat(amountPaidRupees) * 100);
    const customerName = customers.find((c) => c.id === customerId)?.labName || "Unknown Lab";

    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, customerName, amountPaidPaise, mode, referenceNo, description }),
      });
      const d = await res.json();
      if (d.success) {
        setBillingForm({ customerId: "", amountPaidRupees: "", mode: "UPI", referenceNo: "", description: "" });
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Action: Submit Support Ticket
  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    const { customerId, subject, description, priority } = ticketForm;
    if (!customerId || !subject || !description) return;
    const customerName = customers.find((c) => c.id === customerId)?.labName || "Unknown Lab";

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, customerName, subject, description, priority }),
      });
      const d = await res.json();
      if (d.success) {
        setTicketForm({ customerId: "", subject: "", description: "", priority: "Medium" });
        fetchTicketsData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Action: Add Support message / change ticket status
  async function handleUpdateTicket(id: string, status?: TicketRecord["status"], replyText?: string) {
    try {
      const res = await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          msgText: replyText?.trim(),
          msgSender: "Staff",
        }),
      });
      const d = await res.json();
      if (d.success) {
        if (replyText) setNewTicketMsg("");
        setSelectedTicket(d.ticket);
        fetchTicketsData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Action: Toggle Config Flag
  async function handleToggleConfig(key: keyof AppConfig) {
    try {
      const updatedValue = !appConfig[key];
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: updatedValue }),
      });
      const d = await res.json();
      if (d.success) setAppConfig(d.config);
    } catch (err) {
      console.error(err);
    }
  }

  function handleCopy(token: string, id: string) {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Calculate Overview Stats
  const totalRevenuePaise = payments.reduce((s, p) => s + p.amountPaidPaise, 0);
  const activeSubsCount = licenses.filter((l) => l.status === "active").length;
  const mrrPaise = licenses
    .filter((l) => l.status === "active")
    .reduce((s, l) => {
      const factor = l.tier === "Enterprise" ? 900000 : l.tier === "Pro" ? 450000 : 150000; // in paise
      return s + factor;
    }, 0);
  const openTicketsCount = tickets.filter((t) => t.status !== "Resolved").length;
  const conversionRate = customers.length ? Math.round((activeSubsCount / customers.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-teal-500/20">
              M
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              MedX <span className="text-teal-400 font-normal">ERP &amp; CRM Admin Portal</span>
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono bg-slate-900 border border-slate-800 rounded px-2.5 py-1">
            v0.2.0 · Live Admin Environment
          </span>
        </div>
      </header>

      {/* Toolbar / Tabs Navigation */}
      <div className="bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {[
            { id: "overview", label: "📊 Dashboard Overview" },
            { id: "licenses", label: "🔑 License & Devices" },
            { id: "crm", label: "👤 Customer Pipeline (CRM)" },
            { id: "billing", label: "🧾 Subscriptions & Payments" },
            { id: "tickets", label: "🛠️ Support Desk Help" },
            { id: "config", label: "⚙️ Global App Configurations" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedCustomer(null);
                setSelectedTicket(null);
              }}
              className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === tab.id
                  ? "border-b-2 border-teal-500 text-teal-400 bg-slate-900/50"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fadeIn">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { title: "Monthly Rec. Revenue (MRR)", val: `₹${(mrrPaise / 100).toLocaleString()}`, desc: "Based on active tiers", color: "text-teal-400" },
                { title: "Total Revenue Logged", val: `₹${(totalRevenuePaise / 100).toLocaleString()}`, desc: "Cash flow history", color: "text-emerald-400" },
                { title: "Active Licenses", val: `${activeSubsCount} Labs`, desc: `${licenses.length} keys total`, color: "text-purple-400" },
                { title: "Conversion Ratio", val: `${conversionRate}%`, desc: "Leads converted to keys", color: "text-yellow-400" },
                { title: "Pending Tickets", val: `${openTicketsCount} Issues`, desc: "Requires support attention", color: "text-red-400" },
              ].map((kpi, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg">
                  <div className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500">{kpi.title}</div>
                  <div className={`text-2xl font-black mt-2 ${kpi.color}`}>{kpi.val}</div>
                  <div className="text-xs text-slate-400 mt-1">{kpi.desc}</div>
                </div>
              ))}
            </div>

            {/* Quick Renewal alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">🔔 Upcoming Renewals &amp; Alerts (15 Days)</h2>
                {licenses.filter((l) => {
                  const days = Math.ceil((new Date(l.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return days >= 0 && days <= 15 && l.status === "active";
                }).length === 0 ? (
                  <div className="text-sm text-slate-500 py-4 text-center">No subscriptions expiring in the next 15 days.</div>
                ) : (
                  <div className="space-y-3">
                    {licenses
                      .filter((l) => {
                        const days = Math.ceil((new Date(l.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return days >= 0 && days <= 15 && l.status === "active";
                      })
                      .map((l) => {
                        const daysLeft = Math.ceil((new Date(l.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={l.id} className="flex justify-between items-center p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
                            <div>
                              <div className="font-bold text-white">{l.labName}</div>
                              <div className="text-xs text-slate-400 mt-0.5">Key: {l.id} · Phone: {l.contactPhone}</div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {daysLeft} Days Left
                              </span>
                              <div className="text-xs text-slate-400 mt-1">Expiry: {new Date(l.validUntil).toLocaleDateString()}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Quick system check */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                <h2 className="text-lg font-bold text-white">🟢 Operations Checklist</h2>
                <div className="space-y-3.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Registered CRM Leads</span>
                    <span className="font-mono font-bold">{customers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Logged Payments</span>
                    <span className="font-mono font-bold text-emerald-400">{payments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Active Live Installations</span>
                    <span className="font-mono font-bold text-teal-400">
                      {licenses.reduce((s, l) => s + (l.devices?.length || 0), 0)} devices
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Maintenance Mode Status</span>
                    <span className={`font-bold ${appConfig.maintenanceMode ? "text-red-400" : "text-emerald-400"}`}>
                      {appConfig.maintenanceMode ? "ACTIVE" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LICENSES & DEVICES */}
        {activeTab === "licenses" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
            {/* Form */}
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">🔑 Issue License Key</h2>
                <form onSubmit={handleCreateLicense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Lab Name</label>
                    <input
                      type="text"
                      required
                      placeholder=" Nagpur City Diagnostic Lab"
                      value={licenseForm.labName}
                      onChange={(e) => setLicenseForm({ ...licenseForm, labName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +91 99999 88888"
                      value={licenseForm.contactPhone}
                      onChange={(e) => setLicenseForm({ ...licenseForm, contactPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Plan Tier</label>
                      <select
                        value={licenseForm.tier}
                        onChange={(e) => setLicenseForm({ ...licenseForm, tier: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                      >
                        <option value="Starter">Starter (1 Dev)</option>
                        <option value="Pro">Pro (3 Devs)</option>
                        <option value="Enterprise">Enterprise (999 Devs)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Validity</label>
                      <select
                        value={licenseForm.validDays}
                        onChange={(e) => setLicenseForm({ ...licenseForm, validDays: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                      >
                        <option value="30">30 Days</option>
                        <option value="90">90 Days</option>
                        <option value="365">1 Year</option>
                        <option value="1825">5 Years</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm shadow-md"
                  >
                    Generate Key Block
                  </button>
                </form>
              </div>

              {generatedKey && (
                <div className="bg-teal-950/20 border border-teal-500/30 rounded-xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-teal-400 text-sm">✓ Asymmetric Token Signed</h3>
                    <button onClick={() => setGeneratedKey(null)} className="text-slate-400 hover:text-slate-200">✕</button>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg text-center border border-slate-800">
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Key ID</div>
                    <div className="text-lg font-black text-white font-mono mt-0.5">{generatedKey.id}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Token Block</label>
                    <textarea
                      readOnly
                      value={generatedKey.token}
                      className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[9.5px] text-teal-300 resize-none select-all"
                    />
                  </div>
                  <button
                    onClick={() => handleCopy(generatedKey.token, generatedKey.id)}
                    className="w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 font-bold py-2 rounded-lg text-sm transition"
                  >
                    {copiedId === generatedKey.id ? "✓ Copied to clipboard" : "📋 Copy Token"}
                  </button>
                </div>
              )}
            </div>

            {/* Issued Keys Table */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Issued System Keys</h2>
                <button onClick={fetchLicenses} className="text-xs text-teal-400 hover:text-teal-300 font-bold">↻ Refresh</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold uppercase text-slate-500 bg-slate-900/50">
                      <th className="px-6 py-3">Client details</th>
                      <th className="px-6 py-3">Tier</th>
                      <th className="px-6 py-3">Device installations</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {licenses.map((l) => {
                      const deviceLimits = { Starter: 1, Pro: 3, Enterprise: "∞" };
                      const limit = deviceLimits[l.tier] || 1;
                      const connectedCount = l.devices?.length || 0;
                      return (
                        <tr key={l.id} className="hover:bg-slate-900/10 text-sm">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{l.labName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{l.contactPhone} · Key: <span className="font-mono">{l.id}</span></div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">{l.tier}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-200 text-xs">{connectedCount} / {limit} Devices</div>
                            {l.devices && l.devices.length > 0 && (
                              <div className="text-[10.5px] text-slate-400 mt-1 space-y-0.5">
                                {l.devices.map((d, idx) => (
                                  <div key={idx} className="font-mono flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                    <span>{d.hostname}</span>
                                    <span className="text-slate-500 text-[10px]">({new Date(d.lastSeenAt).toLocaleDateString()})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2.5 justify-end">
                              <button onClick={() => handleCopy(l.token, l.id)} className="text-xs text-slate-400 hover:text-white">Copy</button>
                              {l.status === "active" && (
                                <button onClick={() => handleRevokeLicense(l.id)} className="text-xs text-red-400 hover:text-red-300 font-bold">Revoke</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CRM PIPELINE */}
        {activeTab === "crm" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Create lead form & CRM Pipeline Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">👤 Register New Lab Lead</h2>
                <form onSubmit={handleCreateCustomer} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Lab Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Care Diagnostic Nagpur"
                      value={crmForm.labName}
                      onChange={(e) => setCrmForm({ ...crmForm, labName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +91 99900 11122"
                      value={crmForm.contactPhone}
                      onChange={(e) => setCrmForm({ ...crmForm, contactPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">City / Location</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nagpur, Maharashtra"
                      value={crmForm.location}
                      onChange={(e) => setCrmForm({ ...crmForm, location: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      value={crmForm.gstin}
                      onChange={(e) => setCrmForm({ ...crmForm, gstin: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm shadow-md"
                  >
                    Add Lead to CRM
                  </button>
                </form>
              </div>

              {/* Leads list with detailed notes view */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-4">Customer Directory &amp; Stages</h2>
                  {customers.length === 0 ? (
                    <div className="text-sm text-slate-500 py-4 text-center">No leads registered. Add a lab lead on the left.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {customers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCustomer(c)}
                          className={`p-4 border rounded-lg cursor-pointer transition flex items-center justify-between ${
                            selectedCustomer?.id === c.id
                              ? "bg-slate-900 border-teal-500 shadow"
                              : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white">{c.labName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              📞 {c.contactPhone} · {c.location} {c.gstin && `· GSTIN: ${c.gstin}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={c.stage}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateStage(c.id, e.target.value as any)}
                              className="bg-slate-850 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                            >
                              <option value="Lead">Lead</option>
                              <option value="Trial">Trial</option>
                              <option value="Active">Active (Subscribed)</option>
                              <option value="Expired">Expired</option>
                              <option value="Churned">Churned</option>
                            </select>
                            <span className="text-xs text-slate-500 font-mono">📝 {c.notes.length} notes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected customer interaction logs */}
                {selectedCustomer && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-bold text-white text-base">📝 Engagement logs for {selectedCustomer.labName}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {selectedCustomer.id} · Current stage: {selectedCustomer.stage}</div>
                      </div>
                      <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-200">✕</button>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {selectedCustomer.notes.length === 0 ? (
                        <div className="text-xs text-slate-600 text-center py-2">No logs for this client. Type a note below to start.</div>
                      ) : (
                        selectedCustomer.notes.map((n, i) => (
                          <div key={i} className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
                            <div className="flex justify-between text-slate-500">
                              <span className="font-bold">{n.author}</span>
                              <span className="font-mono">{new Date(n.at).toLocaleString()}</span>
                            </div>
                            <div className="text-slate-200">{n.text}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Log customer interaction details (e.g. called client, interested in Pro upgrade...)"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                      />
                      <button type="submit" className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 rounded-lg text-xs font-bold">
                        Add Log
                      </button>
                    </form>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: BILLING & SUBSCRIPTIONS */}
        {activeTab === "billing" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
            {/* Form */}
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">🧾 Record Subscription Payment</h2>
                <form onSubmit={handleCreatePayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Select Customer Lab</label>
                    <select
                      value={billingForm.customerId}
                      required
                      onChange={(e) => setBillingForm({ ...billingForm, customerId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.labName} ({c.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Amount Paid (₹ Rupees)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 5000"
                      value={billingForm.amountPaidRupees}
                      onChange={(e) => setBillingForm({ ...billingForm, amountPaidRupees: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Payment Mode</label>
                      <select
                        value={billingForm.mode}
                        onChange={(e) => setBillingForm({ ...billingForm, mode: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Credit/Debit Card</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Reference ID (Ref No)</label>
                      <input
                        type="text"
                        placeholder="e.g. Txn-223400"
                        value={billingForm.referenceNo}
                        onChange={(e) => setBillingForm({ ...billingForm, referenceNo: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Invoice Notes / Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Annual renewal for Pro tier"
                      value={billingForm.description}
                      onChange={(e) => setBillingForm({ ...billingForm, description: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm shadow-md"
                  >
                    Register Payment Receipt
                  </button>
                </form>
              </div>
            </div>

            {/* Payments List Table */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">💰 Billing Transactions History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold uppercase text-slate-500 bg-slate-900/50">
                      <th className="px-6 py-3">Receipt ID / Lab Name</th>
                      <th className="px-6 py-3">Amount Paid</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Reference / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500">No payment records logged.</td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/10 text-sm">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{p.customerName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">Rec ID: {p.id} {p.description && `· ${p.description}`}</div>
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-bold font-mono">
                            ₹{(p.amountPaidPaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-xs">
                            {p.mode}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-400">
                            <div>{p.referenceNo || "N/A"}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{new Date(p.issuedAt).toLocaleString("en-IN")}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUPPORT HELP DESK */}
        {activeTab === "tickets" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
            {/* Form */}
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">🛠️ Open Support Ticket</h2>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Customer Lab</label>
                    <select
                      value={ticketForm.customerId}
                      required
                      onChange={(e) => setTicketForm({ ...ticketForm, customerId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                    >
                      <option value="">-- Choose Client --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.labName} ({c.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SQLite database migration error"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Triage Priority</label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Incident Details</label>
                    <textarea
                      required
                      placeholder="Describe the issue reported by the client lab in detail..."
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 resize-none focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm shadow-md"
                  >
                    Open Ticket
                  </button>
                </form>
              </div>
            </div>

            {/* Tickets directory and chat thread */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">Support Incident Tickets</h2>
                {tickets.length === 0 ? (
                  <div className="text-sm text-slate-500 py-4 text-center">No active tickets registered.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {tickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`p-4 border rounded-lg cursor-pointer transition flex items-center justify-between ${
                          selectedTicket?.id === t.id
                            ? "bg-slate-900 border-teal-500 shadow"
                            : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{t.subject}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              t.priority === "Critical"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                                : t.priority === "High"
                                ? "bg-orange-500/10 text-orange-400"
                                : "bg-slate-500/10 text-slate-400"
                            }`}>
                              {t.priority}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Lab: {t.customerName} · ID: {t.id} · Updated: {new Date(t.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={t.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleUpdateTicket(t.id, e.target.value as any)}
                            className="bg-slate-850 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat simulator threads details */}
              {selectedTicket && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-base">🛠️ Ticket Response Thread: {selectedTicket.subject}</h3>
                      <div className="text-xs text-slate-400 mt-0.5">Status: {selectedTicket.status} · Triage: {selectedTicket.priority}</div>
                    </div>
                    <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-200">✕</button>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-lg text-xs space-y-2 text-slate-300">
                    <div className="font-bold text-white">Original Incident Details:</div>
                    <div className="italic font-serif">"{selectedTicket.description}"</div>
                  </div>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                    {selectedTicket.messages.length === 0 ? (
                      <div className="text-xs text-slate-600 text-center py-2">No replies logged yet. Reply below to log update notes.</div>
                    ) : (
                      selectedTicket.messages.map((m, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-xs max-w-[80%] space-y-1 ${
                            m.sender === "Staff"
                              ? "bg-teal-950/20 border border-teal-500/20 text-slate-100 ml-auto"
                              : "bg-slate-900 border border-slate-850 text-slate-300"
                          }`}
                        >
                          <div className="flex justify-between text-slate-500 gap-4 text-[10px]">
                            <span className="font-bold">{m.sender}</span>
                            <span className="font-mono">{new Date(m.at).toLocaleDateString()}</span>
                          </div>
                          <div>{m.text}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTicketMsg.trim()) return;
                      handleUpdateTicket(selectedTicket.id, undefined, newTicketMsg);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Type ticket resolution update notes or client response messages..."
                      value={newTicketMsg}
                      onChange={(e) => setNewTicketMsg(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                    <button type="submit" className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 rounded-lg text-xs font-bold text-teal-400">
                      Send Reply
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: APP CONFIGURATIONS */}
        {activeTab === "config" && (
          <div className="max-w-xl mx-auto bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">⚙️ Global Feature Configurations</h2>
              <p className="text-xs text-slate-400">
                These toggles control advanced LIMS module check gates remotely. Client machines query these status lines dynamically.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { k: "allowAbdm", label: "National Digital Health ABDM API Gating", desc: "Allow ABHA integration and schema validation checks." },
                { k: "allowWhatsApp", label: "WhatsApp Cloud Gateway", desc: "Toggle WhatsApp API communication threads." },
                { k: "allowSms", label: "SMS Transaction Carrier Gateway", desc: "Enable/disable automatic transactional mobile text messages." },
                { k: "maintenanceMode", label: "Global Maintenance Hold Mode", desc: "Lock out client apps for server maintenance." },
              ].map((flag) => (
                <div
                  key={flag.k}
                  onClick={() => handleToggleConfig(flag.k as keyof AppConfig)}
                  className={`p-4 border rounded-lg cursor-pointer flex justify-between items-center transition ${
                    appConfig[flag.k as keyof AppConfig]
                      ? "bg-slate-900/60 border-teal-500/30"
                      : "bg-slate-900/30 border-slate-850 opacity-70"
                  }`}
                >
                  <div className="max-w-[75%]">
                    <div className="font-bold text-white text-sm">{flag.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{flag.desc}</div>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        appConfig[flag.k as keyof AppConfig]
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {appConfig[flag.k as keyof AppConfig] ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 p-4 border border-slate-800 rounded-lg text-xs text-slate-400 leading-relaxed font-mono">
              ★ Active telemetry: Client apps read config maps from the gateway endpoint on every system boot.
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
