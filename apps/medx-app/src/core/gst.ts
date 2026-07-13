/**
 * GST engine for Indian diagnostic-lab invoices.
 *
 * - Intra-state supply (supplier state == place of supply): CGST + SGST, each = rate/2.
 * - Inter-state supply: IGST = full rate.
 * - Diagnostic services are frequently GST-exempt; lines can be marked `exempt`.
 * - Default SAC for medical lab & diagnostic services is 999316.
 *
 * All amounts are integer paise. Discounts reduce the taxable value before tax.
 */
import type { Paise } from "./money";
import { pctOf, roundToRupee } from "./money";

export const DEFAULT_SAC = "999316";

export interface LineInput {
  name: string;
  qty?: number; // default 1
  unitPricePaise: Paise;
  /** Flat discount on this line (paise). Applied before percentage discount. */
  discountPaise?: Paise;
  /** Percentage discount on this line (e.g. 10 for 10%). */
  discountPct?: number;
  /** GST rate percent (0, 5, 12, 18). Ignored if exempt. */
  gstRatePct?: number;
  /** If true, the line is GST-exempt (no tax charged). */
  exempt?: boolean;
  hsnSac?: string;
  /** Free-form reference back to the source order item. */
  ref?: string;
}

export interface InvoiceInput {
  lines: LineInput[];
  supplierStateCode: string; // e.g. "27" (Maharashtra)
  placeOfSupplyStateCode: string;
  /** Overall bill discount in paise, distributed proportionally across taxable lines. */
  billDiscountPaise?: Paise;
  /** Round the grand total to the nearest rupee (default true). */
  roundOff?: boolean;
}

export interface LineResult {
  name: string;
  qty: number;
  unitPricePaise: Paise;
  grossPaise: Paise; // qty * unit
  discountPaise: Paise; // line + share of bill discount
  taxablePaise: Paise; // gross - discount
  gstRatePct: number;
  exempt: boolean;
  cgstPaise: Paise;
  sgstPaise: Paise;
  igstPaise: Paise;
  totalTaxPaise: Paise;
  lineTotalPaise: Paise; // taxable + tax
  hsnSac: string;
  ref?: string;
}

export interface InvoiceResult {
  lines: LineResult[];
  interState: boolean;
  grossPaise: Paise;
  totalDiscountPaise: Paise;
  taxablePaise: Paise;
  cgstPaise: Paise;
  sgstPaise: Paise;
  igstPaise: Paise;
  totalTaxPaise: Paise;
  roundOffPaise: Paise;
  grandTotalPaise: Paise;
}

function lineGross(line: LineInput): Paise {
  const qty = line.qty ?? 1;
  return Math.round(line.unitPricePaise * qty);
}

function lineDiscount(line: LineInput, gross: Paise): Paise {
  let d = line.discountPaise ?? 0;
  if (line.discountPct) d += pctOf(gross - d, line.discountPct);
  return Math.min(d, gross); // never discount below zero
}

export function computeInvoice(input: InvoiceInput): InvoiceResult {
  const interState = input.supplierStateCode !== input.placeOfSupplyStateCode;
  const roundOff = input.roundOff ?? true;

  // Pass 1: line gross + line-level discount -> preliminary taxable.
  const prelim = input.lines.map((line) => {
    const gross = lineGross(line);
    const disc = lineDiscount(line, gross);
    return { line, gross, lineDisc: disc, taxable: gross - disc };
  });

  const taxableBeforeBill = prelim.reduce((s, p) => s + p.taxable, 0);

  // Distribute a bill-level discount proportionally across taxable value.
  const billDiscount = Math.min(input.billDiscountPaise ?? 0, taxableBeforeBill);

  const lines: LineResult[] = prelim.map((p, idx) => {
    let share = 0;
    if (billDiscount > 0 && taxableBeforeBill > 0) {
      // Give the remainder to the last line so shares sum exactly to billDiscount.
      const isLast = idx === prelim.length - 1;
      share = isLast
        ? billDiscount - prelim.slice(0, idx).reduce((s, q) => s + Math.floor((billDiscount * q.taxable) / taxableBeforeBill), 0)
        : Math.floor((billDiscount * p.taxable) / taxableBeforeBill);
    }
    const taxable = p.taxable - share;
    const rate = p.line.exempt ? 0 : p.line.gstRatePct ?? 0;
    const tax = rate > 0 ? pctOf(taxable, rate) : 0;
    let cgst = 0, sgst = 0, igst = 0;
    if (tax > 0) {
      if (interState) {
        igst = tax;
      } else {
        cgst = Math.round(tax / 2);
        sgst = tax - cgst;
      }
    }
    const totalTax = cgst + sgst + igst;
    return {
      name: p.line.name,
      qty: p.line.qty ?? 1,
      unitPricePaise: p.line.unitPricePaise,
      grossPaise: p.gross,
      discountPaise: p.lineDisc + share,
      taxablePaise: taxable,
      gstRatePct: rate,
      exempt: !!p.line.exempt,
      cgstPaise: cgst,
      sgstPaise: sgst,
      igstPaise: igst,
      totalTaxPaise: totalTax,
      lineTotalPaise: taxable + totalTax,
      hsnSac: p.line.hsnSac ?? DEFAULT_SAC,
      ref: p.line.ref,
    };
  });

  const gross = lines.reduce((s, l) => s + l.grossPaise, 0);
  const totalDiscount = lines.reduce((s, l) => s + l.discountPaise, 0);
  const taxable = lines.reduce((s, l) => s + l.taxablePaise, 0);
  const cgst = lines.reduce((s, l) => s + l.cgstPaise, 0);
  const sgst = lines.reduce((s, l) => s + l.sgstPaise, 0);
  const igst = lines.reduce((s, l) => s + l.igstPaise, 0);
  const totalTax = cgst + sgst + igst;

  const preRound = taxable + totalTax;
  const grandTotal = roundOff ? roundToRupee(preRound) : preRound;
  const roundOffPaise = grandTotal - preRound;

  return {
    lines,
    interState,
    grossPaise: gross,
    totalDiscountPaise: totalDiscount,
    taxablePaise: taxable,
    cgstPaise: cgst,
    sgstPaise: sgst,
    igstPaise: igst,
    totalTaxPaise: totalTax,
    roundOffPaise,
    grandTotalPaise: grandTotal,
  };
}
