export interface ParsedAnalyzerResult {
  barcode: string;
  results: Record<string, string>; // Maps parameter code (e.g. "HGB") -> value (e.g. "14.2")
  protocol: "HL7" | "ASTM";
}

/**
 * Parses raw HL7 or ASTM text frames received from lab analyzers via serial COM or TCP sockets.
 */
export function parseAnalyzerFrame(raw: string): ParsedAnalyzerResult | null {
  if (!raw || !raw.trim()) return null;

  // Normalize lines split by Carriage Return \r or Newline \n
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  // Detect message format
  const isHL7 = lines.some((l) => l.startsWith("MSH|"));
  const isASTM = lines.some((l) => l.startsWith("H|") || l.startsWith("H\\"));

  if (!isHL7 && !isASTM) return null;

  let barcode = "";
  const results: Record<string, string> = {};

  if (isHL7) {
    for (const line of lines) {
      const fields = line.split("|");
      const segmentType = fields[0];

      if (segmentType === "OBR") {
        // e.g. OBR|1||260713-0001||^^^CBC
        const rawBarcode = fields[3] || fields[2] || "";
        barcode = rawBarcode.includes("^") ? rawBarcode.split("^")[0] : rawBarcode;
      } else if (segmentType === "OBX") {
        // e.g. OBX|1|NM|HGB^Hemoglobin|14.2|g/dL
        const testField = fields[3] || "";
        const value = fields[5] || "";

        let testCode = testField;
        if (testField.includes("^")) {
          const parts = testField.split("^").map((p) => p.trim()).filter(Boolean);
          testCode = parts[0] || testField;
        }

        if (testCode && value) {
          results[testCode.toUpperCase()] = value;
        }
      }
    }
  } else {
    // ASTM Protocol parsing
    for (const line of lines) {
      const fields = line.split("|");
      const segmentType = fields[0];

      if (segmentType === "O") {
        // e.g. O|1|260713-0001||^^^CBC
        const rawBarcode = fields[2] || fields[1] || "";
        barcode = rawBarcode.includes("^") ? rawBarcode.split("^")[0] : rawBarcode;
      } else if (segmentType === "R") {
        // e.g. R|1|^^^HGB|14.2|g/dL
        const testField = fields[2] || "";
        const value = fields[3] || "";

        let testCode = testField;
        if (testField.includes("^")) {
          const parts = testField.split("^").map((p) => p.trim()).filter(Boolean);
          testCode = parts[0] || testField;
        }

        if (testCode && value) {
          results[testCode.toUpperCase()] = value;
        }
      }
    }
  }

  if (!barcode) return null;

  return {
    barcode: barcode.trim(),
    results,
    protocol: isHL7 ? "HL7" : "ASTM",
  };
}
