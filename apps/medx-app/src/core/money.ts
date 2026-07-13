/**
 * Money is stored everywhere as integer paise to avoid floating-point errors.
 * 1 rupee = 100 paise. All arithmetic in the app should go through these helpers.
 */

export type Paise = number;

/** Convert a rupee value (number or string like "120.50") to integer paise. */
export function rupeesToPaise(rupees: number | string): Paise {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!isFinite(n)) return 0;
  // Round to nearest paise to kill FP dust (e.g. 120.1*100 = 12009.9999).
  return Math.round(n * 100);
}

/** Convert integer paise to a rupee number (may have decimals). */
export function paiseToRupees(paise: Paise): number {
  return Math.round(paise) / 100;
}

/** Indian-grouped number, e.g. 1234567 -> "12,34,567". Operates on a rupee number. */
export function groupIndian(value: number): string {
  const neg = value < 0;
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  // Indian grouping: last 3 digits, then groups of 2.
  let out = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  return (neg ? "-" : "") + out + "." + decPart;
}

/** Format paise as an INR string, e.g. 1234550 -> "₹12,345.50". */
export function formatINR(paise: Paise, withSymbol = true): string {
  const rupees = paiseToRupees(paise);
  return (withSymbol ? "₹" : "") + groupIndian(rupees);
}

/** Round a paise amount to the nearest whole rupee. Returns paise. */
export function roundToRupee(paise: Paise): Paise {
  return Math.round(paise / 100) * 100;
}

/** Apply a percentage (e.g. 10 for 10%) to a paise amount, rounded to nearest paise. */
export function pctOf(paise: Paise, pct: number): Paise {
  return Math.round((paise * pct) / 100);
}
