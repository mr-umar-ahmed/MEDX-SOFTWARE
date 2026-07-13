import type { Patient } from "../data/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${fmtDate(d)}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

export function ageString(p: Pick<Patient, "dob" | "ageYears" | "ageMonths" | "ageDays">): string {
  if (p.dob) {
    const now = new Date();
    const dob = new Date(p.dob);
    let years = now.getFullYear() - dob.getFullYear();
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) years--;
    if (years >= 1) return `${years} Y`;
    const months = Math.max(0, Math.floor((now.getTime() - dob.getTime()) / (30.44 * 86400000)));
    return `${months} M`;
  }
  const parts: string[] = [];
  if (p.ageYears) parts.push(`${p.ageYears} Y`);
  if (p.ageMonths) parts.push(`${p.ageMonths} M`);
  if (p.ageDays) parts.push(`${p.ageDays} D`);
  return parts.join(" ") || "—";
}

export const sexLabel = (s: string) => (s === "M" ? "Male" : s === "F" ? "Female" : "Other");
