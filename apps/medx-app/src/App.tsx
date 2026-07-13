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

// Analytics
import Analytics360 from "./features/Analytics360";
import MisReports from "./features/MisReports";

// Settings
import UsersPage from "./features/UsersPage";
import ReportTemplate from "./features/ReportTemplate";
import BackupPage from "./features/BackupPage";
import AbdmPage from "./features/AbdmPage";

export default function App() {
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
