/**
 * Financial-year aware numbering for invoices and sample accessions.
 * Indian FY runs 1 April -> 31 March.
 */

export interface FinancialYear {
  startYear: number; // e.g. 2024
  endYear: number; // e.g. 2025
  label: string; // "24-25"
  key: string; // "2024-25" (stable key for sequence storage)
}

export function financialYear(date: Date): FinancialYear {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based; April = 3
  const startYear = m >= 3 ? y : y - 1;
  const endYear = startYear + 1;
  const two = (n: number) => String(n % 100).padStart(2, "0");
  return {
    startYear,
    endYear,
    label: `${two(startYear)}-${two(endYear)}`,
    key: `${startYear}-${two(endYear)}`,
  };
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * Build an invoice number like "MEDX/24-25/000123".
 * @param prefix lab-configurable series prefix (default "INV")
 * @param fy     financial year
 * @param seq    running sequence within the FY
 * @param width  zero-pad width (default 5)
 */
export function formatInvoiceNo(prefix: string, fy: FinancialYear, seq: number, width = 5): string {
  const p = (prefix || "INV").trim();
  return `${p}/${fy.label}/${pad(seq, width)}`;
}

/**
 * Build a sample accession like "240713-0042" (YYMMDD-seq).
 * Daily sequence resets each day when using this format.
 */
export function formatAccessionNo(date: Date, seq: number, width = 4): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}-${pad(seq, width)}`;
}

/** Key used to scope a per-day sequence, e.g. "acc:2026-07-13". */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
