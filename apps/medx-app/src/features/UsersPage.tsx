import { useState } from "react";
import { useStore } from "../data/store";
import { Page, Section, Field, useForm } from "../ui/bits";
import { isRouteAllowed } from "../core/licensing";
import type { UserRole } from "../data/types";

const PAGE_GROUPS = [
  {
    title: "Front Desk",
    pages: [
      { to: "/", label: "Dashboard" },
      { to: "/queue", label: "Queue / Tokens" },
      { to: "/patients/new", label: "New Patient" },
      { to: "/new", label: "New Order" },
      { to: "/estimates", label: "Estimates" },
    ]
  },
  {
    title: "Lab",
    pages: [
      { to: "/samples", label: "Sample Tracking" },
      { to: "/results", label: "Result Entry" },
      { to: "/verification", label: "Verification" },
    ]
  },
  {
    title: "Reports",
    pages: [
      { to: "/reports", label: "Report List" },
      { to: "/delivery", label: "Delivery Status" },
    ]
  },
  {
    title: "Billing",
    pages: [
      { to: "/invoices", label: "Invoices" },
      { to: "/payments", label: "Payments" },
      { to: "/outstanding", label: "Outstanding" },
      { to: "/tpa", label: "TPA Claims" },
    ]
  },
  {
    title: "Doctors",
    pages: [
      { to: "/doctors", label: "Doctor List" },
      { to: "/commission", label: "Commission" },
      { to: "/mou", label: "MOU Clients" },
      { to: "/corporate", label: "Corporate Billing" },
    ]
  },
  {
    title: "Appointments",
    pages: [
      { to: "/calendar", label: "Calendar View" },
      { to: "/home-collection", label: "Home Collection" },
    ]
  },
  {
    title: "Inventory",
    pages: [
      { to: "/reagents", label: "Reagents" },
      { to: "/suppliers", label: "Suppliers" },
    ]
  },
  {
    title: "Quality",
    pages: [
      { to: "/qc", label: "QC Logs" },
      { to: "/temperature", label: "Temperature" },
      { to: "/calibrations", label: "Calibrations" },
      { to: "/sops", label: "SOPs" },
      { to: "/interfacing", label: "Machine Interfacing" },
      { to: "/audit", label: "Audit Log" },
    ]
  },
  {
    title: "Analytics",
    pages: [
      { to: "/analytics", label: "360 Dashboard" },
      { to: "/mis", label: "MIS Reports" },
    ]
  },
  {
    title: "Settings",
    pages: [
      { to: "/settings", label: "Lab Profile" },
      { to: "/users", label: "Users & Roles" },
      { to: "/report-template", label: "Report Template" },
      { to: "/backup", label: "Backup" },
      { to: "/abdm", label: "ABDM" },
    ]
  }
];

export default function UsersPage() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<"staff" | "permissions">("staff");
  const [selectedRole, setSelectedRole] = useState<UserRole>("Receptionist");
  const [showAddUser, setShowAddUser] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const { form, bind, reset } = useForm({ name: "", role: "Receptionist" });

  const allowedPages = store.rolePermissions[selectedRole] || [];

  function saveUser() {
    if (!form.name.trim()) return;
    store.addUser(form.name.trim(), form.role as UserRole);
    reset(); setShowAddUser(false);
  }

  function handlePermissionToggle(pagePath: string) {
    let updated: string[];
    if (allowedPages.includes(pagePath)) {
      updated = allowedPages.filter((p) => p !== pagePath);
    } else {
      updated = [...allowedPages, pagePath];
    }
    store.updateRolePermissions(selectedRole, updated);
    setSavedMsg("Permissions auto-saved");
    setTimeout(() => setSavedMsg(""), 1500);
  }

  function selectAll() {
    const tier = store.activeLicense?.tier || "Starter";
    const allPaths = PAGE_GROUPS.flatMap((g) => g.pages.map((p) => p.to)).filter((path) => isRouteAllowed(path, tier));
    store.updateRolePermissions(selectedRole, allPaths);
  }

  function selectNone() {
    // Keep Dashboard "/" as a mandatory landing page so they don't break the app
    store.updateRolePermissions(selectedRole, ["/"]);
  }

  return (
    <Page title="Users & Roles" sub="Manage staff accounts and configure page visibility settings." actions={
      <div className="row" style={{ alignItems: "center" }}>
        <div className="pill-toggle">
          <button className={activeTab === "staff" ? "on" : ""} onClick={() => setActiveTab("staff")}>Staff Directory</button>
          <button className={activeTab === "permissions" ? "on" : ""} onClick={() => setActiveTab("permissions")}>Role Permissions</button>
        </div>
        {activeTab === "staff" && (
          <button className="btn btn-primary" onClick={() => setShowAddUser(!showAddUser)}>＋ Add User</button>
        )}
      </div>
    }>
      {activeTab === "staff" ? (
        <>
          {showAddUser && (
            <Section title="Add Staff User">
              <div className="grid-3">
                <Field label="Name *"><input {...bind("name")} /></Field>
                <Field label="Role">
                  <select {...bind("role")}>
                    {["Owner", "Receptionist", "Technician", "Pathologist"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="&nbsp;"><button className="btn btn-primary" onClick={saveUser}>Save User</button></Field>
              </div>
            </Section>
          )}
          <Section title={`Staff Members (${store.users.length})`} pad={false}>
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {store.users.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.name}</b> {u.id === store.currentUserId && <span className="badge badge-info">Current</span>}</td>
                    <td><span className="badge badge-muted">{u.role}</span></td>
                    <td>{u.active ? <span className="badge badge-ok">Active</span> : <span className="badge badge-danger">Disabled</span>}</td>
                    <td>
                      {u.id !== "U-admin" && (
                        <button className="btn" onClick={() => store.setUserActive(u.id, !u.active)}>{u.active ? "Disable" : "Enable"}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      ) : (
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="card card-pad" style={{ width: 280, position: "sticky", top: 84 }}>
            <h3>Select Role</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(["Owner", "Receptionist", "Technician", "Pathologist"] as UserRole[]).map((r) => (
                <button key={r} className={`btn ${selectedRole === r ? "btn-primary" : ""}`} onClick={() => setSelectedRole(r)} style={{ justifyContent: "flex-start", width: "100%" }}>
                  👤 {r}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={selectAll}>Check All</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={selectNone}>Clear All</button>
            </div>
            {savedMsg && <div style={{ color: "var(--ok)", fontWeight: 700, fontSize: 13, marginTop: 12, textAlign: "center" }}>✓ {savedMsg}</div>}
          </div>
          <div className="col">
            <Section title={`Allowed Pages for: ${selectedRole}`}>
              <div className="grid-2" style={{ gap: 20 }}>
                {PAGE_GROUPS.map((g) => {
                  const tier = store.activeLicense?.tier || "Starter";
                  const visiblePages = g.pages.filter((p) => isRouteAllowed(p.to, tier));
                  if (visiblePages.length === 0) return null;

                  return (
                    <div key={g.title} className="card card-pad" style={{ background: "#f8fafc" }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "var(--primary-dark)", fontSize: 14 }}>{g.title}</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {visiblePages.map((p) => {
                          const isChecked = allowedPages.includes(p.to);
                          return (
                            <label key={p.to} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
                              <input type="checkbox" checked={isChecked} onChange={() => handlePermissionToggle(p.to)} disabled={p.to === "/"} />
                              <span style={{ fontWeight: isChecked ? 600 : 400 }}>{p.label}</span>
                              <span className="muted" style={{ fontSize: 11 }}>({p.to})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        </div>
      )}
    </Page>
  );
}
