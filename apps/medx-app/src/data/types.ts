import type { Sex } from "../core/ranges";

/* ---------------- Settings ---------------- */

export interface LabSettings {
  name: string;
  tagline: string;
  addressLine: string;
  city: string;
  stateCode: string; // GST state code, e.g. "27"
  stateName: string;
  phone: string;
  email: string;
  gstin: string;
  invoicePrefix: string;
  footerNote: string;
  /** Default GST rate applied to new orders. 0 = exempt (healthcare default). */
  defaultGstRatePct: number;
  // Report template
  reportPathologist: string;
  reportPathologistQual: string;
  reportTechnologist: string;
  reportShowLogo: boolean;
  // ABDM
  abdmEnabled: boolean;
  abdmHipId: string;
  // LAN Multi-Counter Settings
  lanRole?: "standalone" | "host" | "client";
  lanHostIp?: string;
}

/* ---------------- People ---------------- */

export interface Patient {
  id: string;
  uhid: string; // e.g. MDX-000123
  name: string;
  sex: Sex;
  dob?: string;
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  phone: string;
  address?: string;
  abha?: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  clinic?: string;
  phone?: string;
  commissionPct?: number;
  createdAt: string;
}

export type UserRole = "Owner" | "Receptionist" | "Technician" | "Pathologist";
export interface StaffUser {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

/* ---------------- Orders ---------------- */

export type OrderStatus = "registered" | "collected" | "in-process" | "reported" | "delivered";
export type OrderSource = "Walk-in" | "Doctor Referral" | "Home Collection" | "B2B / MOU" | "Camp";
export type OrderPriority = "Routine" | "Urgent" | "STAT";
export type SampleStatus = "pending" | "collected" | "received" | "processed";

export interface ResultValue {
  analyteCode: string;
  value: string;
  flag?: string | null;
  abnormal?: boolean;
  critical?: boolean;
  rangeText?: string;
  unit?: string;
}

export interface OrderItem {
  testCode: string;
  testName: string;
  category: string;
  sampleType: string;
  pricePaise: number;
  discountPaise: number;
  gstExempt: boolean;
  gstRatePct: number;
  results: ResultValue[];
  verified: boolean;
  sampleStatus: SampleStatus;
}

export interface Payment {
  amountPaise: number;
  mode: "Cash" | "UPI" | "Card" | "Due";
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  invoiceNo: string;
  accessionNo: string;
  patientId: string;
  doctorId?: string;
  source: OrderSource;
  priority: OrderPriority;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  billDiscountPaise: number;
  grossPaise: number;
  discountPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  payments: Payment[];
  verifiedAt?: string;
  verifiedBy?: string;
  deliveredAt?: string;
  deliveredVia?: "WhatsApp" | "Print" | "Email";
}

/* ---------------- Front desk ---------------- */

export interface QueueToken {
  id: string;
  number: number; // daily token number
  label: string; // "T-012"
  name?: string;
  purpose: string;
  issuedAt: string;
  status: "waiting" | "serving" | "done";
}

export interface EstimateItem { name: string; pricePaise: number; }
export interface Estimate {
  id: string;
  name: string;
  phone?: string;
  items: EstimateItem[];
  discountPaise: number;
  createdAt: string;
  convertedOrderId?: string;
}

/* ---------------- Billing extras ---------------- */

export type TpaStatus = "Draft" | "Filed" | "Approved" | "Settled" | "Rejected";
export interface TpaClaim {
  id: string;
  orderId?: string;
  patientName: string;
  tpaName: string;
  policyNo: string;
  claimNo: string;
  amountPaise: number;
  status: TpaStatus;
  filedAt: string;
  settledAt?: string;
  notes?: string;
}

export interface MouClient {
  id: string;
  name: string;
  contact?: string;
  discountPct: number;
  notes?: string;
  createdAt: string;
}

export interface CorporateBill {
  id: string;
  clientId: string;
  period: string; // "Jul 2026"
  description: string;
  amountPaise: number;
  status: "Unpaid" | "Paid";
  createdAt: string;
}

export interface CommissionPayout {
  id: string;
  doctorId: string;
  monthKey: string; // "2026-07"
  amountPaise: number;
  paidAt: string;
}

/* ---------------- Appointments ---------------- */

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // "10:30"
  patientName: string;
  phone?: string;
  purpose: string;
  status: "Scheduled" | "Arrived" | "Done" | "Missed";
}

export interface HomeVisit {
  id: string;
  date: string;
  slot: string;
  patientName: string;
  phone?: string;
  address: string;
  phlebotomist?: string;
  status: "Scheduled" | "Collected" | "Received" | "Cancelled";
  notes?: string;
  /** Online-booking id (from the public website) — used to dedupe imports. */
  webRef?: string;
}

/* ---------------- Inventory ---------------- */

export interface Reagent {
  id: string;
  name: string;
  unit: string; // "kit", "box", "mL"
  stockQty: number;
  reorderLevel: number;
  expiryDate?: string;
  supplierId?: string;
}

export interface StockMovement {
  id: string;
  reagentId: string;
  delta: number; // + in, − out
  reason: string;
  at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
}

/* ---------------- Quality ---------------- */

export interface QcLog {
  id: string;
  date: string;
  analyzer: string;
  test: string;
  level: string; // "L1" | "L2"...
  value: number;
  mean: number;
  sd: number;
  remark?: string;
}

export interface TemperatureLog {
  id: string;
  date: string;
  time: string;
  equipment: string;
  tempC: number;
  low: number;
  high: number;
  by?: string;
}

export interface Calibration {
  id: string;
  equipment: string;
  lastDone: string;
  dueDate: string;
  remark?: string;
}

export interface SopDoc {
  id: string;
  title: string;
  category: string;
  version: string;
  effectiveDate: string;
  notes?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  action: string;
  detail: string;
}
