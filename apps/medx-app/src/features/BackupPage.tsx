import { useState } from "react";
import { Page } from "../ui/bits";

export default function BackupPage() {
  const [imported, setImported] = useState(false);

  function exportData() {
    const raw = localStorage.getItem("medx-store-v1") ?? "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `medx-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          localStorage.setItem("medx-store-v1", JSON.stringify(data));
          setImported(true);
          setTimeout(() => location.reload(), 1500);
        } catch {
          alert("Invalid backup file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function resetData() {
    if (confirm("⚠ This will DELETE ALL local data. This cannot be undone.\n\nAre you absolutely sure?")) {
      if (confirm("FINAL WARNING: All patients, orders, results, and settings will be permanently lost. Continue?")) {
        localStorage.removeItem("medx-store-v1");
        location.reload();
      }
    }
  }

  return (
    <Page title="Backup & Restore" sub="Export your data, import from backup, or reset to factory defaults.">
      <div className="card card-pad" style={{ maxWidth: 720 }}>
        <h2>💾 Export Backup</h2>
        <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Downloads a JSON file containing all your lab data (patients, orders, results, settings). Store it safely on a USB drive or cloud folder.
        </div>
        <button className="btn btn-primary btn-lg" onClick={exportData}>⬇ Download Backup (JSON)</button>
      </div>

      <div className="card card-pad" style={{ maxWidth: 720, marginTop: 16 }}>
        <h2>📂 Import / Restore</h2>
        <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Load a previously exported backup file. This will <b>replace all current data</b> with the backup.
        </div>
        {imported && <div className="badge badge-ok" style={{ marginBottom: 12 }}>✓ Backup imported — reloading…</div>}
        <button className="btn btn-lg" onClick={importData}>📂 Import from Backup File</button>
      </div>

      <div className="card card-pad" style={{ maxWidth: 720, marginTop: 16 }}>
        <h2>⚠ Reset Data</h2>
        <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Permanently delete ALL local data and start fresh. <b>This cannot be undone.</b> Make sure you export a backup first.
        </div>
        <button className="btn btn-danger btn-lg" onClick={resetData}>🗑 Reset All Data</button>
      </div>

      <div className="card card-pad" style={{ maxWidth: 720, marginTop: 16 }}>
        <h2>🕐 Automatic Backups</h2>
        <div className="muted" style={{ fontSize: 13 }}>
          In the packaged MedX desktop app (Electron), automatic backups are scheduled to run daily to a configured folder or USB drive.
          This feature activates when the app is built with the Electron packaging (M8 milestone).
        </div>
      </div>
    </Page>
  );
}
