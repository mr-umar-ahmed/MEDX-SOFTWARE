/**
 * pdfReport.ts — Pure-JS PDF generation engine for pathology test reports.
 *
 * Uses jsPDF to produce branded A4 PDFs containing:
 *   - Lab header (name, address, GSTIN, phone, email)
 *   - Patient demographics (Name, Age/Sex, UHID, Referred By)
 *   - Order metadata (Invoice, Accession, Reg Date, Report Date)
 *   - Test results table with abnormal flags (▲/▼)
 *   - Footer with pathologist signature and disclaimer
 */
import { jsPDF } from "jspdf";
import type { Order, Patient, Doctor } from "../data/types";
import type { LabSettings } from "../data/types";
import { getTest } from "../catalog";

/* -------- colours -------- */
const PRIMARY    = "#0d9488";
const DARK       = "#1e293b";
const MUTED      = "#64748b";
const LIGHT_LINE = "#cbd5e1";
const FLAG_HIGH  = "#dc2626";
const FLAG_LOW   = "#2563eb";

/* -------- helpers -------- */
function fmtDatePdf(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function ageStr(p: Patient): string {
  if (p.dob) {
    const now = new Date();
    const dob = new Date(p.dob);
    let years = now.getFullYear() - dob.getFullYear();
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) years--;
    return years >= 1 ? `${years} Y` : `${Math.max(0, Math.floor((now.getTime() - dob.getTime()) / (30.44 * 86400000)))} M`;
  }
  const parts: string[] = [];
  if (p.ageYears) parts.push(`${p.ageYears} Y`);
  if (p.ageMonths) parts.push(`${p.ageMonths} M`);
  if (p.ageDays) parts.push(`${p.ageDays} D`);
  return parts.join(" ") || "—";
}

const sexLabel = (s: string) => (s === "M" ? "Male" : s === "F" ? "Female" : "Other");

/* -------- main export -------- */
export function generateReportPdf(
  order: Order,
  patient: Patient | undefined,
  doctor: Doctor | undefined,
  settings: LabSettings,
): void {
  if (!patient) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();    // 210
  const H = doc.internal.pageSize.getHeight();   // 297
  const ML = 14;         // left margin
  const MR = 14;         // right margin
  const CW = W - ML - MR; // content width
  let Y = 14;             // cursor

  /* ===== HEADER ===== */
  // Brand mark circle
  doc.setFillColor(PRIMARY);
  doc.circle(ML + 6, Y + 5, 6, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("M", ML + 6, Y + 7, { align: "center" });

  // Lab name
  doc.setTextColor(DARK);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(settings.name, ML + 15, Y + 4);

  // Address & contact
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text(`${settings.addressLine}, ${settings.city}, ${settings.stateName}`, ML + 15, Y + 9);
  doc.text(`${settings.phone}  ·  ${settings.email}`, ML + 15, Y + 13);

  // Right side — GSTIN & Accession
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  doc.setFont("helvetica", "bold");
  doc.text(`GSTIN: ${settings.gstin}`, W - MR, Y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Acc No: ${order.accessionNo}`, W - MR, Y + 9, { align: "right" });

  Y += 19;

  // Separator
  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(ML, Y, W - MR, Y);
  Y += 3;

  /* ===== TITLE ===== */
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK);
  doc.text("LABORATORY TEST REPORT", W / 2, Y + 3, { align: "center" });
  Y += 8;

  // Thin separator
  doc.setDrawColor(LIGHT_LINE);
  doc.setLineWidth(0.3);
  doc.line(ML, Y, W - MR, Y);
  Y += 5;

  /* ===== PATIENT / ORDER METADATA ===== */
  const meta: [string, string][] = [
    ["Patient", patient.name],
    ["Age / Sex", `${ageStr(patient)} / ${sexLabel(patient.sex)}`],
    ["UHID", patient.uhid],
    ["Ref. Doctor", doctor?.name ?? "Self"],
    ["Invoice No", order.invoiceNo],
    ["Reg Date", fmtDatePdf(order.createdAt)],
    ["Report Date", order.verifiedAt ? fmtDatePdf(order.verifiedAt) : fmtDatePdf(order.createdAt)],
    ["Priority", order.priority],
  ];

  doc.setFontSize(8.5);
  const colW = CW / 2;
  for (let i = 0; i < meta.length; i += 2) {
    const [k1, v1] = meta[i];
    const pair2 = meta[i + 1];
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MUTED);
    doc.text(`${k1}:`, ML, Y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(DARK);
    doc.text(v1, ML + 25, Y);

    if (pair2) {
      const [k2, v2] = pair2;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(MUTED);
      doc.text(`${k2}:`, ML + colW, Y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(DARK);
      doc.text(v2, ML + colW + 25, Y);
    }
    Y += 5;
  }

  Y += 3;
  doc.setDrawColor(LIGHT_LINE);
  doc.line(ML, Y, W - MR, Y);
  Y += 6;

  /* ===== RESULTS TABLE PER TEST ===== */
  for (const item of order.items) {
    const def = getTest(item.testCode);

    // Test title
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY);
    doc.text(item.testName.toUpperCase(), ML, Y);
    Y += 1.5;
    doc.setDrawColor(LIGHT_LINE);
    doc.setLineWidth(0.2);
    doc.line(ML, Y, W - MR, Y);
    Y += 4;

    // Table header
    const cols = [
      { label: "Investigation", x: ML, w: 60 },
      { label: "Result", x: ML + 62, w: 30 },
      { label: "Unit", x: ML + 96, w: 24 },
      { label: "Reference Range", x: ML + 122, w: 60 },
    ];
    doc.setFillColor("#f1f5f9");
    doc.rect(ML, Y - 2.5, CW, 6, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MUTED);
    for (const c of cols) doc.text(c.label, c.x, Y);
    Y += 5;

    // Rows
    doc.setFontSize(8.5);
    for (const r of item.results) {
      // Check if we need a new page
      if (Y > H - 40) {
        doc.addPage();
        Y = 14;
      }

      const analyte = def?.analytes.find((a) => a.code === r.analyteCode);
      const name = analyte?.name ?? r.analyteCode;
      const value = r.value || "—";
      const unit = r.unit ?? analyte?.unit ?? "";
      const range = r.rangeText || "—";
      const isAbn = r.abnormal;
      const flag = r.flag;

      // Investigation name
      doc.setFont("helvetica", "normal");
      doc.setTextColor(DARK);
      doc.text(name, cols[0].x, Y);

      // Result value — bold + colored if abnormal
      if (isAbn) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(flag === "H" || flag === "HH" ? FLAG_HIGH : FLAG_LOW);
        const arrow = flag === "H" || flag === "HH" ? " ▲" : " ▼";
        doc.text(value + arrow, cols[1].x, Y);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(DARK);
        doc.text(value, cols[1].x, Y);
      }

      // Unit
      doc.setFont("helvetica", "normal");
      doc.setTextColor(MUTED);
      doc.text(unit, cols[2].x, Y);

      // Reference range
      doc.text(range, cols[3].x, Y);

      Y += 5;
    }

    Y += 4;
  }

  /* ===== FOOTER / SIGNATURE ===== */
  // Ensure footer is at the bottom
  if (Y > H - 50) {
    doc.addPage();
    Y = 14;
  }

  Y = Math.max(Y + 10, H - 55);

  // Separator
  doc.setDrawColor(LIGHT_LINE);
  doc.setLineWidth(0.3);
  doc.line(ML, Y, W - MR, Y);
  Y += 6;

  // Disclaimer on left
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(MUTED);
  const footerLines = doc.splitTextToSize(settings.footerNote, CW * 0.55);
  doc.text(footerLines, ML, Y);

  // Pathologist signature on right
  const sigX = W - MR - 50;
  doc.setDrawColor(DARK);
  doc.setLineWidth(0.4);
  doc.line(sigX, Y + 2, sigX + 50, Y + 2);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK);
  doc.text(settings.reportPathologist, sigX + 25, Y + 7, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text(settings.reportPathologistQual, sigX + 25, Y + 11, { align: "center" });

  if (order.verifiedAt) {
    doc.setFontSize(7);
    doc.text(`Verified: ${fmtDatePdf(order.verifiedAt)}`, sigX + 25, Y + 15, { align: "center" });
  }

  // End of report marker
  doc.setFontSize(7);
  doc.setTextColor("#999999");
  doc.text("*** End of Report ***", W / 2, H - 10, { align: "center" });

  /* ===== SAVE ===== */
  const filename = `${order.invoiceNo.replace(/\//g, "-")}_${patient.name.replace(/\s/g, "_")}.pdf`;
  doc.save(filename);
}
