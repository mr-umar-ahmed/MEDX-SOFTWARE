/**
 * Reference-range selection and abnormal-value flagging.
 * Ranges are chosen by sex + age (in days), then a numeric result is flagged H/L/N,
 * with optional critical (panic) limits.
 */

export type Sex = "M" | "F" | "O"; // Other/unknown
export type RangeSex = "M" | "F" | "A"; // A = any/all

export interface ReferenceRange {
  /** Applies to this sex, or "A" for all. */
  sex: RangeSex;
  /** Inclusive age window in days. Defaults: 0 .. Infinity. */
  ageMinDays?: number;
  ageMaxDays?: number;
  low?: number | null;
  high?: number | null;
  /** Critical/panic thresholds — values at/below or at/above trigger a critical flag. */
  criticalLow?: number | null;
  criticalHigh?: number | null;
  unit?: string;
  /** For descriptive results, the expected normal text (e.g. "Negative"). */
  normalText?: string;
  /** Optional human label like "Adult male". */
  label?: string;
}

export type Flag = "L" | "N" | "H" | "LL" | "HH";

export interface FlagResult {
  flag: Flag | null; // null when not determinable (e.g. non-numeric, no range)
  abnormal: boolean;
  critical: boolean;
  rangeText: string; // e.g. "13.0 - 17.0"
}

const AGE_MAX = Number.POSITIVE_INFINITY;

export function ageInDays(dob: Date, on: Date = new Date()): number {
  return Math.max(0, Math.floor((on.getTime() - dob.getTime()) / 86_400_000));
}

/** Pick the most specific matching range for a patient. Sex-specific beats "A". */
export function pickRange(
  ranges: ReferenceRange[],
  sex: Sex,
  ageDays: number,
): ReferenceRange | null {
  const candidates = ranges.filter((r) => {
    const min = r.ageMinDays ?? 0;
    const max = r.ageMaxDays ?? AGE_MAX;
    if (ageDays < min || ageDays > max) return false;
    if (r.sex === "A") return true;
    return r.sex === sex;
  });
  if (candidates.length === 0) return null;
  // Prefer the narrowest age window (pediatric ranges must win over unbounded adult
  // ranges), then break ties by sex-specificity (specific over "A").
  candidates.sort((a, b) => {
    const span = (r: ReferenceRange) => (r.ageMaxDays ?? AGE_MAX) - (r.ageMinDays ?? 0);
    if (span(a) !== span(b)) return span(a) - span(b);
    const sexScore = (r: ReferenceRange) => (r.sex === "A" ? 1 : 0);
    return sexScore(a) - sexScore(b);
  });
  return candidates[0];
}

export function rangeText(r: ReferenceRange | null): string {
  if (!r) return "";
  if (r.normalText) return r.normalText;
  const lo = r.low ?? null;
  const hi = r.high ?? null;
  if (lo != null && hi != null) return `${lo} - ${hi}`;
  if (lo != null) return `> ${lo}`;
  if (hi != null) return `< ${hi}`;
  return "";
}

/** Flag a numeric value against a chosen range. */
export function flagValue(value: number, r: ReferenceRange | null): FlagResult {
  const base: FlagResult = { flag: null, abnormal: false, critical: false, rangeText: rangeText(r) };
  if (r == null || !isFinite(value)) return base;

  const { low, high, criticalLow, criticalHigh } = r;
  let flag: Flag = "N";
  let abnormal = false;
  let critical = false;

  if (low != null && value < low) {
    flag = "L";
    abnormal = true;
  } else if (high != null && value > high) {
    flag = "H";
    abnormal = true;
  }
  if (criticalLow != null && value <= criticalLow) {
    flag = "LL";
    abnormal = true;
    critical = true;
  } else if (criticalHigh != null && value >= criticalHigh) {
    flag = "HH";
    abnormal = true;
    critical = true;
  }
  return { flag, abnormal, critical, rangeText: base.rangeText };
}

/** Convenience: pick + flag in one call. */
export function evaluate(
  value: number,
  ranges: ReferenceRange[],
  sex: Sex,
  ageDays: number,
): FlagResult {
  return flagValue(value, pickRange(ranges, sex, ageDays));
}
