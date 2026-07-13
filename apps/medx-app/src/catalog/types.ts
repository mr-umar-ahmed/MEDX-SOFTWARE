import type { ReferenceRange } from "../core/ranges";

/** A single measured parameter within a test (e.g. "Haemoglobin" inside CBC). */
export interface Analyte {
  code: string;
  name: string;
  unit?: string;
  inputType?: "numeric" | "text" | "select";
  options?: string[];
  ranges?: ReferenceRange[];
  /** Optional default/normal text for descriptive analytes. */
  defaultText?: string;
}

/** A billable test. May contain one or many analytes. */
export interface TestDef {
  code: string;
  name: string;
  category: string;
  sampleType: string; // Whole Blood / Serum / Plasma / Urine / Stool ...
  method?: string;
  defaultPricePaise: number;
  tatHours?: number;
  /** Diagnostic services are usually GST-exempt in India. */
  gstExempt?: boolean;
  gstRatePct?: number;
  analytes: Analyte[];
  /** True for long-tail specialised tests handled as referral/send-outs (name-only). */
  sendOut?: boolean;
  /** Shortcut/alias keywords for quick search. */
  aliases?: string[];
}

/** A bundle of tests sold together (e.g. a health check-up package). */
export interface PanelDef {
  code: string;
  name: string;
  category: string;
  testCodes: string[];
  /** If set, overrides the sum of member test prices. */
  defaultPricePaise?: number;
}
