-- MedX Relational Schema for reference and direct LIMS queries

CREATE TABLE IF NOT EXISTS store_data (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Core tables for reporting/external compatibility
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  uhid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sex TEXT NOT NULL,
  dob TEXT,
  age_years INTEGER,
  age_months INTEGER,
  phone TEXT NOT NULL,
  address TEXT,
  abha TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clinic TEXT,
  phone TEXT,
  commission_pct REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  invoice_no TEXT UNIQUE NOT NULL,
  accession_no TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  doctor_id TEXT,
  source TEXT NOT NULL,
  priority TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  gross_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL,
  taxable_paise INTEGER NOT NULL,
  cgst_paise INTEGER NOT NULL,
  sgst_paise INTEGER NOT NULL,
  grand_total_paise INTEGER NOT NULL,
  FOREIGN KEY(patient_id) REFERENCES patients(id),
  FOREIGN KEY(doctor_id) REFERENCES doctors(id)
);
