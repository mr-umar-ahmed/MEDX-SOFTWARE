import type { TestDef } from "./types";
import { COMMON_TESTS, COMMON_PANELS } from "./tests";
import directory from "./directory.json";

export type { TestDef, PanelDef, Analyte } from "./types";
export { COMMON_TESTS, COMMON_PANELS };

/** The long-tail send-out directory: name-only entries parsed from the master catalog. */
export interface DirectoryEntry {
  sr: number;
  name: string;
}
export const DIRECTORY: DirectoryEntry[] = directory as DirectoryEntry[];

/** Default price for a send-out test until the lab sets its own (₹500). */
export const SENDOUT_DEFAULT_PRICE = 50000;

/** Turn a directory name into a minimal billable send-out TestDef. */
export function sendOutTest(name: string, sr: number): TestDef {
  return {
    code: `SO-${sr}`,
    name,
    category: "Send-out / Referral",
    sampleType: "As applicable",
    defaultPricePaise: SENDOUT_DEFAULT_PRICE,
    gstExempt: true,
    sendOut: true,
    analytes: [{ code: `SO-${sr}`, name, inputType: "text" }],
  };
}

/** Total number of tests we can bill: curated + directory. */
export const TOTAL_CATALOG_SIZE = COMMON_TESTS.length + DIRECTORY.length;

const byCode = new Map<string, TestDef>(COMMON_TESTS.map((t) => [t.code, t]));
export function getTest(code: string): TestDef | undefined {
  return byCode.get(code);
}

/** Search across curated tests (with ranges) first, then the send-out directory. */
export function searchCatalog(query: string, limit = 30): TestDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMON_TESTS.slice(0, limit);
  const hits: TestDef[] = [];
  for (const t of COMMON_TESTS) {
    if (
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.aliases?.some((a) => a.includes(q))
    ) {
      hits.push(t);
    }
  }
  for (const e of DIRECTORY) {
    if (hits.length >= limit) break;
    if (e.name.toLowerCase().includes(q)) hits.push(sendOutTest(e.name, e.sr));
  }
  return hits.slice(0, limit);
}
