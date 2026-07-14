export function parseLisPayload(raw: string) {
  let sampleId = "";
  const results: Array<{ testCode: string; value: string; unit: string; flag: string }> = [];

  const lines = raw.split(/\r?\n|\r/);

  for (const line of lines) {
    if (!line.trim()) continue;

    // VERY naive ASTM parsing
    // Typical ASTM lines:
    // O|1|SAMP123||...
    // R|1|^^^WBC|7.5|10^3/uL|...

    if (line.startsWith("O|") || line.startsWith("3O|") || line.match(/^\d+O\|/)) {
      const parts = line.split("|");
      if (parts.length > 2) {
        sampleId = parts[2].trim();
      }
    } else if (line.startsWith("R|") || line.startsWith("4R|") || line.startsWith("5R|") || line.startsWith("6R|") || line.match(/^\d+R\|/)) {
      const parts = line.split("|");
      if (parts.length > 3) {
        let testCode = parts[2];
        if (testCode.includes("^")) {
          const subparts = testCode.split("^");
          testCode = subparts[subparts.length - 1]; // e.g. ^^^WBC -> WBC
        }
        const value = parts[3].trim();
        const unit = parts.length > 4 ? parts[4].trim() : "";
        const flag = parts.length > 6 ? parts[6].trim() : "";
        
        if (testCode) {
          results.push({ testCode, value, unit, flag });
        }
      }
    }
  }

  return { sampleId, results };
}
