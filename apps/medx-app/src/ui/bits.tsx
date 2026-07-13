import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";

/** Standard page wrapper: sticky topbar with title + actions, then content. */
export function Page({ title, sub, actions, children }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="topbar no-print">
        <div>
          <h1>{title}</h1>
          {sub && <div className="muted" style={{ fontSize: 13 }}>{sub}</div>}
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          {actions}
          <TopbarQuick />
        </div>
      </div>
      <div className="content">{children}</div>
    </>
  );
}

function TopbarQuick() {
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const current = users.find((u) => u.id === currentUserId);

  function handleUserChange(targetId: string) {
    const targetUser = users.find((u) => u.id === targetId);
    if (targetUser?.role === "Owner") {
      const code = prompt("Enter Administrator Passcode (default '1234') to switch to Owner account:");
      if (code !== "1234") {
        alert("Incorrect Administrator Passcode.");
        return;
      }
    }
    setCurrentUser(targetId);
  }

  return (
    <div className="row" style={{ alignItems: "center", gap: 8, marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid var(--border)" }}>
      <Link to="/patients/new" className="btn">👤 New Patient</Link>
      <Link to="/new" className="btn btn-primary">🧾 New Order</Link>
      <select className="input" style={{ width: 180 }} value={currentUserId} onChange={(e) => handleUserChange(e.target.value)} title={`Role: ${current?.role ?? ""}`}>
        {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
      </select>
    </div>
  );
}

export function Section({ title, actions, children, pad = true }: { title?: string; actions?: ReactNode; children: ReactNode; pad?: boolean }) {
  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
      {(title || actions) && (
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div className="row">{actions}</div>
        </div>
      )}
      {pad ? <div className="card-pad">{children}</div> : children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card-pad muted">{children}</div>;
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="field" style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <label>{label}</label>
      {children}
    </div>
  );
}

/** Minimal controlled-form helper for small "add entry" forms. */
export function useForm<T extends Record<string, string>>(initial: T) {
  const [form, setForm] = useState<T>(initial);
  const bind = (k: keyof T) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
    className: "input",
  });
  const reset = () => setForm(initial);
  return { form, bind, reset, setForm };
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
