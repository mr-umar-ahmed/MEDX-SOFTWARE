import * as path from "path";
import * as fs from "fs";

let useSqlite = false;
let db: any = null;
let dbPathJson = "";
let jsonData: Record<string, string> = {};

export function initDb(userDataPath: string) {
  const dbDir = path.join(userDataPath, "Database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    // Attempt dynamic load of better-sqlite3 native package
    const Database = require("better-sqlite3");
    const dbPath = path.join(dbDir, "medx.db");
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS store_data (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    useSqlite = true;
    console.log("✓ Using SQLite Local Database at:", dbPath);
  } catch (err) {
    console.warn("⚠️ better-sqlite3 not available. Falling back to JSON storage.");
    dbPathJson = path.join(dbDir, "medx-store.json");
    if (fs.existsSync(dbPathJson)) {
      try {
        jsonData = JSON.parse(fs.readFileSync(dbPathJson, "utf-8"));
      } catch {
        jsonData = {};
      }
    }
    useSqlite = false;
    console.log("✓ Using JSON Local Database at:", dbPathJson);
  }
}

export function getStore(key: string): string | null {
  if (useSqlite && db) {
    try {
      const stmt = db.prepare("SELECT value FROM store_data WHERE key = ?");
      const row = stmt.get(key) as { value: string } | undefined;
      return row ? row.value : null;
    } catch (err) {
      console.error("SQLite read error:", err);
    }
  }
  return jsonData[key] || null;
}

export function setStore(key: string, value: string): void {
  if (useSqlite && db) {
    try {
      const stmt = db.prepare("INSERT OR REPLACE INTO store_data (key, value) VALUES (?, ?)");
      stmt.run(key, value);
      return;
    } catch (err) {
      console.error("SQLite write error, falling back to JSON:", err);
    }
  }
  jsonData[key] = value;
  fs.writeFileSync(dbPathJson, JSON.stringify(jsonData, null, 2), "utf-8");
}

export function removeStore(key: string): void {
  if (useSqlite && db) {
    try {
      const stmt = db.prepare("DELETE FROM store_data WHERE key = ?");
      stmt.run(key);
      return;
    } catch (err) {
      console.error("SQLite delete error:", err);
    }
  }
  delete jsonData[key];
  fs.writeFileSync(dbPathJson, JSON.stringify(jsonData, null, 2), "utf-8");
}
