import { describe, it, expect } from "vitest";
import { rupeesToPaise, paiseToRupees, groupIndian, formatINR, roundToRupee } from "./money";
import { computeInvoice } from "./gst";
import { financialYear, formatInvoiceNo, formatAccessionNo } from "./numbering";
import { pickRange, flagValue, evaluate, ageInDays, type ReferenceRange } from "./ranges";

describe("money", () => {
  it("converts rupees to paise without FP dust", () => {
    expect(rupeesToPaise(120.1)).toBe(12010);
    expect(rupeesToPaise("120.50")).toBe(12050);
    expect(rupeesToPaise(0)).toBe(0);
  });
  it("round-trips", () => {
    expect(paiseToRupees(12050)).toBe(120.5);
  });
  it("groups digits the Indian way", () => {
    expect(groupIndian(1234567)).toBe("12,34,567.00");
    expect(groupIndian(1000)).toBe("1,000.00");
    expect(groupIndian(999)).toBe("999.00");
  });
  it("formats INR", () => {
    expect(formatINR(1234550)).toBe("₹12,345.50");
  });
  it("rounds to nearest rupee", () => {
    expect(roundToRupee(12049)).toBe(12000);
    expect(roundToRupee(12050)).toBe(12100);
  });
});

describe("gst", () => {
  it("splits CGST+SGST intra-state", () => {
    const r = computeInvoice({
      supplierStateCode: "27",
      placeOfSupplyStateCode: "27",
      lines: [{ name: "Test", unitPricePaise: 100000, gstRatePct: 18 }],
    });
    expect(r.interState).toBe(false);
    expect(r.cgstPaise).toBe(9000);
    expect(r.sgstPaise).toBe(9000);
    expect(r.igstPaise).toBe(0);
    expect(r.totalTaxPaise).toBe(18000);
    expect(r.grandTotalPaise).toBe(118000);
  });
  it("uses IGST inter-state", () => {
    const r = computeInvoice({
      supplierStateCode: "27",
      placeOfSupplyStateCode: "29",
      lines: [{ name: "Test", unitPricePaise: 100000, gstRatePct: 12 }],
    });
    expect(r.interState).toBe(true);
    expect(r.igstPaise).toBe(12000);
    expect(r.cgstPaise).toBe(0);
  });
  it("honors exempt lines (diagnostic services)", () => {
    const r = computeInvoice({
      supplierStateCode: "27",
      placeOfSupplyStateCode: "27",
      lines: [{ name: "CBC", unitPricePaise: 30000, exempt: true, gstRatePct: 18 }],
    });
    expect(r.totalTaxPaise).toBe(0);
    expect(r.grandTotalPaise).toBe(30000);
  });
  it("applies line discounts before tax", () => {
    const r = computeInvoice({
      supplierStateCode: "27",
      placeOfSupplyStateCode: "27",
      lines: [{ name: "Test", unitPricePaise: 100000, discountPct: 10, gstRatePct: 18 }],
    });
    expect(r.taxablePaise).toBe(90000);
    expect(r.totalTaxPaise).toBe(16200);
  });
  it("distributes a bill discount and reconciles totals", () => {
    const r = computeInvoice({
      supplierStateCode: "27",
      placeOfSupplyStateCode: "27",
      billDiscountPaise: 10000,
      lines: [
        { name: "A", unitPricePaise: 60000, exempt: true },
        { name: "B", unitPricePaise: 40000, exempt: true },
      ],
    });
    // Bill discount fully distributed, taxable = 100000 - 10000.
    expect(r.totalDiscountPaise).toBe(10000);
    expect(r.taxablePaise).toBe(90000);
    expect(r.grandTotalPaise).toBe(90000);
  });
  it("adds a round-off line to reach whole rupees", () => {
    const r = computeInvoice({
      supplierStateCode: "27",
      placeOfSupplyStateCode: "27",
      lines: [{ name: "Test", unitPricePaise: 10049, gstRatePct: 0 }],
    });
    expect(r.grandTotalPaise).toBe(10000);
    expect(r.roundOffPaise).toBe(-49);
  });
});

describe("numbering", () => {
  it("computes FY across the April boundary", () => {
    expect(financialYear(new Date("2024-03-31")).label).toBe("23-24");
    expect(financialYear(new Date("2024-04-01")).label).toBe("24-25");
    expect(financialYear(new Date("2026-07-13")).label).toBe("26-27");
  });
  it("formats invoice numbers", () => {
    const fy = financialYear(new Date("2026-07-13"));
    expect(formatInvoiceNo("MEDX", fy, 123)).toBe("MEDX/26-27/00123");
  });
  it("formats accession numbers", () => {
    expect(formatAccessionNo(new Date("2026-07-13"), 42)).toBe("260713-0042");
  });
});

describe("ranges", () => {
  const hb: ReferenceRange[] = [
    { sex: "M", low: 13, high: 17, unit: "g/dL", criticalLow: 7 },
    { sex: "F", low: 12, high: 15, unit: "g/dL", criticalLow: 7 },
    { sex: "A", ageMaxDays: 365, low: 14, high: 22 }, // infants
  ];
  it("picks sex-specific adult range over generic", () => {
    const r = pickRange(hb, "M", ageInDays(new Date("1990-01-01"), new Date("2026-07-13")));
    expect(r?.low).toBe(13);
    expect(r?.high).toBe(17);
  });
  it("picks the infant range by age", () => {
    const r = pickRange(hb, "M", 100);
    expect(r?.low).toBe(14);
  });
  it("flags high and low", () => {
    const male = pickRange(hb, "M", 10000)!;
    expect(flagValue(18, male).flag).toBe("H");
    expect(flagValue(11, male).flag).toBe("L");
    expect(flagValue(15, male).flag).toBe("N");
    expect(flagValue(15, male).abnormal).toBe(false);
  });
  it("flags critical values", () => {
    const res = evaluate(6, hb, "F", 10000);
    expect(res.flag).toBe("LL");
    expect(res.critical).toBe(true);
  });
  it("returns null flag when no range matches", () => {
    expect(flagValue(5, null).flag).toBeNull();
  });
});
