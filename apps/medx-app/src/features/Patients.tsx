import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { fmtDate, ageString, sexLabel } from "../lib/format";

export default function Patients() {
  const { patients, orders } = useStore();
  const [q, setQ] = useState("");
  const list = patients.filter((p) => !q.trim() || `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="topbar no-print"><h1>Patients</h1><Link to="/new" className="btn btn-primary">＋ New Registration</Link></div>
      <div className="content">
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
            <input className="input" style={{ maxWidth: 340 }} placeholder="🔍 Search patients…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {list.length === 0 ? <div className="card-pad muted">No patients yet.</div> : (
            <table>
              <thead><tr><th>Name</th><th>Age/Sex</th><th>Phone</th><th>Visits</th><th>Registered</th></tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td>{ageString(p)} · {sexLabel(p.sex)}</td>
                    <td className="mono">{p.phone}</td>
                    <td>{orders.filter((o) => o.patientId === p.id).length}</td>
                    <td className="muted">{fmtDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
