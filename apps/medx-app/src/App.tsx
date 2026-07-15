import { useState } from "react";
import { useStore } from "./data/store";
import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./ui/Layout";
import Dashboard from "./features/Dashboard";
import NewBill from "./features/NewBill";
import Worklist from "./features/Worklist";
import OrderView from "./features/OrderView";
import Patients from "./features/Patients";
import Settings from "./features/Settings";

// Front desk
import { NewPatient, Queue, CounterDisplay, Estimates } from "./features/frontdesk";

// Lab
import SampleTracking from "./features/SampleTracking";
import ResultEntry from "./features/ResultEntry";
import Verification from "./features/Verification";

// Reports
import ReportList from "./features/ReportList";
import DeliveryStatus from "./features/DeliveryStatus";

// Billing
import Invoices from "./features/Invoices";
import PaymentsPage from "./features/PaymentsPage";
import Outstanding from "./features/Outstanding";
import TpaClaims from "./features/TpaClaims";

// Doctors
import DoctorList from "./features/DoctorList";
import CommissionPage from "./features/CommissionPage";
import MouClients from "./features/MouClients";
import CorporateBilling from "./features/CorporateBilling";

// Appointments
import CalendarView from "./features/CalendarView";
import HomeCollection from "./features/HomeCollection";

// Inventory
import Reagents from "./features/Reagents";
import Suppliers from "./features/Suppliers";

// Quality
import QcLogs from "./features/QcLogs";
import TemperatureLogs from "./features/TemperatureLogs";
import Calibrations from "./features/Calibrations";
import Sops from "./features/Sops";
import AuditLog from "./features/AuditLog";
import InterfacingPage from "./features/InterfacingPage";

// Analytics
import Analytics360 from "./features/Analytics360";
import MisReports from "./features/MisReports";

// Settings
import UsersPage from "./features/UsersPage";
import ReportTemplate from "./features/ReportTemplate";
import BackupPage from "./features/BackupPage";
import AbdmPage from "./features/AbdmPage";

export default function App() {
  const { activeLicense, activateLicense } = useStore();
  const [inputKey, setInputKey] = useState("");
  const [err, setErr] = useState("");
  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    if (!inputKey.trim()) return;
    setErr("");
    setActivating(true);
    try {
      const success = await activateLicense(inputKey);
      if (success) {
        setInputKey("");
      } else {
        setErr("Invalid license key token signature. Please verify and try again.");
      }
    } catch (e) {
      setErr("Failed to connect to license server. Please check your internet connection.");
    } finally {
      setActivating(false);
    }
  }

  // Intercept layout if there is no active license registered
  if (!activeLicense) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at 10% 20%, rgb(4, 159, 108) 0%, rgb(194, 254, 113) 90.1%)",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        padding: 24,
        boxSizing: "border-box"
      }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: 24,
          padding: "48px 36px",
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.12)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔑</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", margin: "0 0 10px 0", letterSpacing: "-0.5px" }}>MedX LIMS Activation</h1>
          <p style={{ fontSize: 14.5, color: "#64748b", margin: "0 0 32px 0", lineHeight: 1.5 }}>
            Welcome to MedX. A valid signed license key is required to use this software. Please enter your license token below to activate.
          </p>

          <div style={{ textAlign: "left", marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Enter License Key Token
            </label>
            <textarea
              style={{
                width: "100%",
                height: 110,
                padding: 14,
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                fontFamily: "monospace",
                fontSize: 12.5,
                background: "#f8fafc",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
                lineHeight: 1.4,
                transition: "border-color 0.2s"
              }}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Paste the complete, long license token here..."
              disabled={activating}
            />
          </div>

          {err && (
            <div style={{
              padding: "12px 16px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              color: "#b91c1c",
              fontSize: 13.5,
              textAlign: "left",
              marginBottom: 24,
              lineHeight: 1.45
            }}>
              ⚠️ {err}
            </div>
          )}

          <button
            style={{
              width: "100%",
              padding: "16px 24px",
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 15.5,
              cursor: "pointer",
              transition: "transform 0.1s, background-color 0.2s",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)"
            }}
            onClick={handleActivate}
            disabled={activating}
          >
            {activating ? "Verifying Token..." : "Activate MedX Software"}
          </button>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 14px 0" }}>
              Don't have a license or forgot your key?
            </p>
            <a
              href="https://wa.me/917204060651?text=Hello%20MedX%20Support,%20I%20would%20like%20to%20request%20a%20demo/license%20key%20for%20the%20LIMS%20software."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                background: "#25d366",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                boxShadow: "0 4px 12px rgba(37, 211, 102, 0.2)"
              }}
            >
              💬 Contact Support on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Counter display is a full-screen route outside the layout */}
        <Route path="/display" element={<CounterDisplay />} />

        <Route element={<Layout />}>
          {/* Dashboard */}
          <Route index element={<Dashboard />} />
          <Route path="worklist" element={<Worklist />} />

          {/* Front desk */}
          <Route path="new" element={<NewBill />} />
          <Route path="queue" element={<Queue />} />
          <Route path="patients/new" element={<NewPatient />} />
          <Route path="patients" element={<Patients />} />
          <Route path="estimates" element={<Estimates />} />

          {/* Order detail (results, report, invoice, barcodes, receipt) */}
          <Route path="order/:id" element={<OrderView />} />

          {/* Lab workflow */}
          <Route path="samples" element={<SampleTracking />} />
          <Route path="results" element={<ResultEntry />} />
          <Route path="verification" element={<Verification />} />

          {/* Reports */}
          <Route path="reports" element={<ReportList />} />
          <Route path="delivery" element={<DeliveryStatus />} />

          {/* Billing */}
          <Route path="invoices" element={<Invoices />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="outstanding" element={<Outstanding />} />
          <Route path="tpa" element={<TpaClaims />} />

          {/* Doctors */}
          <Route path="doctors" element={<DoctorList />} />
          <Route path="commission" element={<CommissionPage />} />
          <Route path="mou" element={<MouClients />} />
          <Route path="corporate" element={<CorporateBilling />} />

          {/* Appointments */}
          <Route path="calendar" element={<CalendarView />} />
          <Route path="home-collection" element={<HomeCollection />} />

          {/* Inventory */}
          <Route path="reagents" element={<Reagents />} />
          <Route path="suppliers" element={<Suppliers />} />

          {/* Quality */}
          <Route path="qc" element={<QcLogs />} />
          <Route path="temperature" element={<TemperatureLogs />} />
          <Route path="calibrations" element={<Calibrations />} />
          <Route path="sops" element={<Sops />} />
          <Route path="interfacing" element={<InterfacingPage />} />
          <Route path="audit" element={<AuditLog />} />

          {/* Analytics */}
          <Route path="analytics" element={<Analytics360 />} />
          <Route path="mis" element={<MisReports />} />

          {/* Settings */}
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="report-template" element={<ReportTemplate />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="abdm" element={<AbdmPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
