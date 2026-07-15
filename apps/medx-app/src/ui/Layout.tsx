import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useStore } from "../data/store";
import { isRouteAllowed, getRouteTierRequired } from "../core/licensing";

interface NavItem { to: string; label: string; icon: string; end?: boolean }
interface NavGroup { title: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  {
    title: "Front Desk",
    items: [
      { to: "/", label: "Dashboard", icon: "▤", end: true },
      { to: "/queue", label: "Queue / Tokens", icon: "🎫" },
      { to: "/patients/new", label: "New Patient", icon: "👤" },
      { to: "/new", label: "New Order", icon: "🧾" },
      { to: "/estimates", label: "Estimates", icon: "📝" },
    ],
  },
  {
    title: "Lab",
    items: [
      { to: "/samples", label: "Sample Tracking", icon: "🧪" },
      { to: "/results", label: "Result Entry", icon: "⌨" },
      { to: "/verification", label: "Verification", icon: "✅" },
    ],
  },
  {
    title: "Reports",
    items: [
      { to: "/reports", label: "Report List", icon: "📄" },
      { to: "/delivery", label: "Delivery Status", icon: "📨" },
    ],
  },
  {
    title: "Billing",
    items: [
      { to: "/invoices", label: "Invoices", icon: "₹" },
      { to: "/payments", label: "Payments", icon: "💳" },
      { to: "/outstanding", label: "Outstanding", icon: "⏰" },
      { to: "/tpa", label: "TPA Claims", icon: "🛡" },
    ],
  },
  {
    title: "Doctors",
    items: [
      { to: "/doctors", label: "Doctor List", icon: "🩺" },
      { to: "/commission", label: "Commission", icon: "🤝" },
      { to: "/mou", label: "MOU Clients", icon: "📇" },
      { to: "/corporate", label: "Corporate Billing", icon: "🏢" },
    ],
  },
  {
    title: "Appointments",
    items: [
      { to: "/calendar", label: "Calendar View", icon: "📅" },
      { to: "/home-collection", label: "Home Collection", icon: "🏠" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { to: "/reagents", label: "Reagents", icon: "🧴" },
      { to: "/suppliers", label: "Suppliers", icon: "🚚" },
    ],
  },
  {
    title: "Quality",
    items: [
      { to: "/qc", label: "QC Logs", icon: "📈" },
      { to: "/temperature", label: "Temperature", icon: "🌡" },
      { to: "/calibrations", label: "Calibrations", icon: "🎚" },
      { to: "/sops", label: "SOPs", icon: "📚" },
      { to: "/interfacing", label: "Machine Interfacing", icon: "📟" },
      { to: "/audit", label: "Audit", icon: "🔍" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { to: "/analytics", label: "360 Dashboard", icon: "🧭" },
      { to: "/mis", label: "MIS Reports", icon: "📊" },
    ],
  },
  {
    title: "Settings",
    items: [
      { to: "/settings", label: "Lab Profile", icon: "🏷" },
      { to: "/users", label: "Users", icon: "👥" },
      { to: "/report-template", label: "Report Template", icon: "🖋" },
      { to: "/backup", label: "Backup", icon: "💾" },
      { to: "/abdm", label: "ABDM", icon: "🇮🇳" },
    ],
  },
];

export default function Layout() {
  const settings = useStore((s) => s.settings);
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const rolePermissions = useStore((s) => s.rolePermissions);
  const activeLicense = useStore((s) => s.activeLicense);
  const lastCloudSync = useStore((s) => s.lastCloudSync);
  const adminNotice = useStore((s) => s.adminNotice);
  const dismissAdminNotice = useStore((s) => s.dismissAdminNotice);

  const currentUser = users.find((u) => u.id === currentUserId);
  const role = currentUser?.role || "Receptionist";
  const allowed = rolePermissions?.[role] || [];
  const tier = activeLicense?.tier || "Starter";
  const isCloudSynced = lastCloudSync && (Date.now() - lastCloudSync) < 15 * 60 * 1000;

  const location = useLocation();
  const routeAllowed = isRouteAllowed(location.pathname, tier);
  const requiredTier = getRouteTierRequired(location.pathname);

  // Auto Updater State
  const [updateStatus, setUpdateStatus] = React.useState<string | null>(null);
  const [updateProgress, setUpdateProgress] = React.useState<number>(0);

  React.useEffect(() => {
    if (window.medx?.onUpdaterStatus) {
      window.medx.onUpdaterStatus((s: { status: string }) => setUpdateStatus(s.status));
    }
    if (window.medx?.onUpdaterProgress) {
      window.medx.onUpdaterProgress((p: number) => setUpdateProgress(p));
    }
  }, []);

  return (
    <div className="app">
      <aside className="sidebar no-print" style={{ overflowY: "auto" }}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <b>MedX</b>
            <div style={{ fontSize: 11, color: "var(--primary)" }}>Lab Management</div>
          </div>
        </div>
        {GROUPS.map((g) => {
          const visibleItems = g.items.filter((item) => allowed.includes(item.to) && isRouteAllowed(item.to, tier));
          if (visibleItems.length === 0) return null;
          return (
            <div key={g.title} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#64748b", padding: "10px 12px 4px", textTransform: "uppercase" }}>{g.title}</div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {visibleItems.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")} style={{ padding: "7px 12px", fontSize: 13.5 }}>
                    <span className="nav-icon">{n.icon}</span>
                    {n.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          );
        })}
        <div className="sidebar-foot" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {updateStatus === "available" && (
            <div style={{ fontSize: 12, padding: "8px", background: "var(--primary)", color: "white", borderRadius: 4, textAlign: "center" }}>
              Downloading update... {Math.round(updateProgress)}%
            </div>
          )}
          {updateStatus === "downloaded" && (
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => window.medx?.installUpdate?.()}>
              Restart &amp; Install Update
            </button>
          )}
          <div>
            <div style={{ color: "#cbd5e1", fontWeight: 700 }}>{settings.name}</div>
            <div style={{ color: "#64748b" }}>v0.1.0 · ● {activeLicense ? `${activeLicense.tier} Tier` : "Working offline"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 4, color: "#64748b" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: isCloudSynced ? "#10b981" : "#ef4444" }} />
              {isCloudSynced ? "Cloud Data Synced" : "Pending Cloud Sync"}
            </div>
          </div>
        </div>
      </aside>
      <div className="main">
        {adminNotice && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e",
            borderRadius: 10, padding: "10px 16px", margin: "12px 16px 0 16px", fontSize: 13, fontWeight: 600,
          }}>
            <span>📢 Message from MedX: {adminNotice}</span>
            <button onClick={dismissAdminNotice} title="Dismiss"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", fontWeight: 800, fontSize: 14 }}>
              ✕
            </button>
          </div>
        )}
        {routeAllowed ? <Outlet /> : <LockedScreen requiredTier={requiredTier} />}
      </div>
    </div>
  );
}

function LockedScreen({ requiredTier }: { requiredTier: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
      <div className="card card-pad" style={{ maxWidth: 440, textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>🔒</div>
        <h2 style={{ marginBottom: "12px", fontSize: "20px", fontWeight: 800 }}>{requiredTier} Module Gated</h2>
        <p className="muted" style={{ fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
          This page requires a **MedX {requiredTier} License**. Your system is currently operating under the free **Starter** tier.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <NavLink to="/settings" className="btn btn-primary">Activate License Key</NavLink>
        </div>
      </div>
    </div>
  );
}
