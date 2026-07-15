import { useState, useMemo } from "react";
import { useStore } from "../data/store";
import { fmtDate } from "../lib/format";
import { Page, Section, Field, Empty, useForm, todayISO } from "../ui/bits";

// Advanced Westgard Rules Engine
function runWestgardRules(
  value: number,
  mean: number,
  sd: number,
  previousRuns: number[]
): { flag: string; cls: string } | null {
  if (sd <= 0) return null;
  const z = (value - mean) / sd;
  const absZ = Math.abs(z);

  // 1. 1-3s Rule (Rejection): Value exceeds +/- 3 SD
  if (absZ > 3) {
    return { flag: "1_3s REJECT", cls: "badge-danger" };
  }

  // Checks for violations exceeding +/- 2 SD
  if (absZ > 2) {
    if (previousRuns.length > 0) {
      const prevVal = previousRuns[0];
      const prevZ = (prevVal - mean) / sd;

      // 2_2s Rule (Rejection): Two consecutive runs exceed +2SD or exceed -2SD
      if (Math.abs(prevZ) > 2 && Math.sign(z) === Math.sign(prevZ)) {
        return { flag: "2_2s REJECT", cls: "badge-danger" };
      }

      // R_4s Rule (Rejection): One run exceeds +2SD and the other -2SD (range > 4SD)
      if (Math.abs(prevZ) > 2 && Math.sign(z) !== Math.sign(prevZ)) {
        return { flag: "R_4s REJECT", cls: "badge-danger" };
      }
    }
    // 1-2s Rule (Warning): Value exceeds +/- 2 SD
    return { flag: "1_2s WARNING", cls: "badge-warn" };
  }

  // 3. 10x Rule (Rejection): 10 consecutive runs on the same side of the mean
  if (previousRuns.length >= 9) {
    const last10 = [value, ...previousRuns.slice(0, 9)];
    const allAbove = last10.every((v) => v > mean);
    const allBelow = last10.every((v) => v < mean);
    if (allAbove || allBelow) {
      return { flag: "10x REJECT", cls: "badge-danger" };
    }
  }

  return null;
}

export default function QcLogs() {
  const store = useStore();
  const [showLogForm, setShowLogForm] = useState(false);
  const { form, bind, reset } = useForm({
    date: todayISO(),
    analyzer: "",
    test: "",
    level: "L1",
    value: "",
    mean: "",
    sd: "",
    remark: "",
  });

  // Extract unique filtering options
  const analyzers = useMemo(() => {
    const set = new Set(store.qcLogs.map((q) => q.analyzer));
    return Array.from(set);
  }, [store.qcLogs]);

  const tests = useMemo(() => {
    const set = new Set(store.qcLogs.map((q) => q.test));
    return Array.from(set);
  }, [store.qcLogs]);

  // Selected filters
  const [selectedAnalyzer, setSelectedAnalyzer] = useState(analyzers[0] || "");
  const [selectedTest, setSelectedTest] = useState(tests[0] || "");
  const [selectedLevel, setSelectedLevel] = useState("L1");

  // Sync selectors if options populate
  useMemo(() => {
    if (!selectedAnalyzer && analyzers.length > 0) setSelectedAnalyzer(analyzers[0]);
    if (!selectedTest && tests.length > 0) setSelectedTest(tests[0]);
  }, [analyzers, tests]);

  // Filter and sort entries chronologically (oldest to newest) for chart plotting
  const filteredChronological = useMemo(() => {
    return store.qcLogs
      .filter(
        (q) =>
          q.analyzer === selectedAnalyzer &&
          q.test === selectedTest &&
          q.level === selectedLevel
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [store.qcLogs, selectedAnalyzer, selectedTest, selectedLevel]);

  // Logs table lists items sorted newest to oldest
  const filteredRecent = useMemo(() => {
    return [...filteredChronological].reverse();
  }, [filteredChronological]);

  // Target stats for selected test/level
  const activeStats = useMemo(() => {
    if (filteredChronological.length === 0) return { mean: 0, sd: 0 };
    const latest = filteredChronological[filteredChronological.length - 1];
    return { mean: latest.mean || 0, sd: latest.sd || 0 };
  }, [filteredChronological]);

  function save() {
    if (!form.analyzer.trim() || !form.test.trim() || !form.value) return;
    store.addQcLog({
      date: form.date,
      analyzer: form.analyzer.trim(),
      test: form.test.trim(),
      level: form.level,
      value: Number(form.value),
      mean: Number(form.mean) || 0,
      sd: Number(form.sd) || 0,
      remark: form.remark.trim() || undefined,
    });
    // Auto-select filter to match new entry for user convenience
    setSelectedAnalyzer(form.analyzer.trim());
    setSelectedTest(form.test.trim());
    setSelectedLevel(form.level);
    reset();
    setShowLogForm(false);
  }

  // LJ Chart Rendering Calculations
  const chartWidth = 650;
  const chartHeight = 300;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 40;

  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const mean = activeStats.mean;
  const sd = activeStats.sd;

  // y-axis scale goes from mean - 3.5 SD to mean + 3.5 SD
  const yMin = mean - 3.5 * sd;
  const yMax = mean + 3.5 * sd;
  const yRange = yMax - yMin;

  function getSvgY(val: number) {
    if (yRange <= 0) return paddingTop + plotHeight / 2;
    const offset = ((val - yMin) / yRange) * plotHeight;
    return chartHeight - paddingBottom - offset;
  }

  function getSvgX(index: number, total: number) {
    if (total <= 1) return paddingLeft + plotWidth / 2;
    const step = plotWidth / (total - 1);
    return paddingLeft + index * step;
  }

  return (
    <Page
      title="NABL QC / IQC Analyzer Logs"
      sub="Accreditation Quality Control with interactive Levey-Jennings charts."
      actions={
        <button className="btn btn-primary" onClick={() => setShowLogForm(!showLogForm)}>
          ＋ Log QC Run
        </button>
      }
    >
      {showLogForm && (
        <Section title="New QC Control Entry">
          <div className="grid-3">
            <Field label="Date *"><input {...bind("date")} type="date" /></Field>
            <Field label="Analyzer *"><input {...bind("analyzer")} placeholder="e.g. BC-6200" /></Field>
            <Field label="Test / Parameter *"><input {...bind("test")} placeholder="e.g. Haemoglobin" /></Field>
            <Field label="Control Level">
              <select {...bind("level")}>
                {["L1", "L2", "L3"].map((l) => (
                  <option key={l} value={l}>{l === "L1" ? "Level 1 (Normal)" : l === "L2" ? "Level 2 (High)" : "Level 3 (Low)"}</option>
                ))}
              </select>
            </Field>
            <Field label="Observed Value *"><input {...bind("value")} className="input mono" placeholder="0.0" /></Field>
            <Field label="Target Mean"><input {...bind("mean")} className="input mono" placeholder="Target Mean" /></Field>
            <Field label="Target SD"><input {...bind("sd")} className="input mono" placeholder="Target SD" /></Field>
            <Field label="Remark / Corrective Action"><input {...bind("remark")} placeholder="e.g. Reagent changed, recalibrated" /></Field>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Save QC Entry</button>
        </Section>
      )}

      {/* QC Filters Bar */}
      <div className="card card-pad grid-3" style={{ marginBottom: 16 }}>
        <Field label="Filter Analyzer">
          <select value={selectedAnalyzer} onChange={(e) => setSelectedAnalyzer(e.target.value)}>
            {analyzers.length === 0 && <option value="">-- No Logs Logged --</option>}
            {analyzers.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Filter Test / Parameter">
          <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)}>
            {tests.length === 0 && <option value="">-- No Logs Logged --</option>}
            {tests.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Control Level">
          <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
            <option value="L1">Level 1 (Normal)</option>
            <option value="L2">Level 2 (High)</option>
            <option value="L3">Level 3 (Low)</option>
          </select>
        </Field>
      </div>

      {filteredChronological.length === 0 ? (
        <Empty>No QC runs logged matching this criteria. Click 'Log QC Run' above.</Empty>
      ) : (
        <div className="grid-2" style={{ gridTemplateColumns: "1fr" }}>
          
          {/* Levey-Jennings Interactive Visual Chart */}
          <Section title={`Levey-Jennings (LJ) Quality Chart — Mean: ${mean}, SD: ${sd}`}>
            <div style={{ display: "flex", justifyContent: "center", background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid var(--border)", overflowX: "auto" }}>
              <svg width={chartWidth} height={chartHeight} style={{ fontFamily: "monospace", fontSize: 10 }}>
                {/* Horizontal reference grid lines */}
                {/* Mean */}
                <line x1={paddingLeft} y1={getSvgY(mean)} x2={chartWidth - paddingRight} y2={getSvgY(mean)} stroke="#10b981" strokeWidth={2} />
                <text x={paddingLeft - 42} y={getSvgY(mean) + 3} fill="#047857" fontWeight="bold">Mean</text>

                {/* +1 SD, -1 SD */}
                <line x1={paddingLeft} y1={getSvgY(mean + sd)} x2={chartWidth - paddingRight} y2={getSvgY(mean + sd)} stroke="#eab308" strokeWidth={1} strokeDasharray="3,3" />
                <text x={paddingLeft - 48} y={getSvgY(mean + sd) + 3} fill="#a16207">+1 SD</text>
                <line x1={paddingLeft} y1={getSvgY(mean - sd)} x2={chartWidth - paddingRight} y2={getSvgY(mean - sd)} stroke="#eab308" strokeWidth={1} strokeDasharray="3,3" />
                <text x={paddingLeft - 48} y={getSvgY(mean - sd) + 3} fill="#a16207">-1 SD</text>

                {/* +2 SD, -2 SD */}
                <line x1={paddingLeft} y1={getSvgY(mean + 2 * sd)} x2={chartWidth - paddingRight} y2={getSvgY(mean + 2 * sd)} stroke="#f97316" strokeWidth={1} strokeDasharray="6,3" />
                <text x={paddingLeft - 48} y={getSvgY(mean + 2 * sd) + 3} fill="#c2410c">+2 SD</text>
                <line x1={paddingLeft} y1={getSvgY(mean - 2 * sd)} x2={chartWidth - paddingRight} y2={getSvgY(mean - 2 * sd)} stroke="#f97316" strokeWidth={1} strokeDasharray="6,3" />
                <text x={paddingLeft - 48} y={getSvgY(mean - 2 * sd) + 3} fill="#c2410c">-2 SD</text>

                {/* +3 SD, -3 SD */}
                <line x1={paddingLeft} y1={getSvgY(mean + 3 * sd)} x2={chartWidth - paddingRight} y2={getSvgY(mean + 3 * sd)} stroke="#ef4444" strokeWidth={1.5} />
                <text x={paddingLeft - 48} y={getSvgY(mean + 3 * sd) + 3} fill="#b91c1c" fontWeight="bold">+3 SD</text>
                <line x1={paddingLeft} y1={getSvgY(mean - 3 * sd)} x2={chartWidth - paddingRight} y2={getSvgY(mean - 3 * sd)} stroke="#ef4444" strokeWidth={1.5} />
                <text x={paddingLeft - 48} y={getSvgY(mean - 3 * sd) + 3} fill="#b91c1c" fontWeight="bold">-3 SD</text>

                {/* vertical grid axis */}
                <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={chartHeight - paddingBottom} stroke="#cbd5e1" />
                <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={chartWidth - paddingRight} y2={chartHeight - paddingBottom} stroke="#cbd5e1" />

                {/* Plot line connections */}
                {filteredChronological.map((q, idx) => {
                  if (idx === 0) return null;
                  const prev = filteredChronological[idx - 1];
                  const x1 = getSvgX(idx - 1, filteredChronological.length);
                  const y1 = getSvgY(prev.value);
                  const x2 = getSvgX(idx, filteredChronological.length);
                  const y2 = getSvgY(q.value);
                  return (
                    <line key={`line-${idx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth={2.5} />
                  );
                })}

                {/* Plot points */}
                {filteredChronological.map((q, idx) => {
                  const x = getSvgX(idx, filteredChronological.length);
                  const y = getSvgY(q.value);

                  // Extract previous runs values for Westgard evaluation
                  const prevRuns = filteredChronological
                    .slice(0, idx)
                    .reverse()
                    .map((it) => it.value);
                  
                  const wg = runWestgardRules(q.value, q.mean, q.sd, prevRuns);
                  const color = wg ? (wg.flag.includes("REJECT") ? "#ef4444" : "#f59e0b") : "#10b981";

                  return (
                    <g key={`point-${idx}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r={6}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        style={{ cursor: "pointer" }}
                      />
                      {/* Date label on X axis */}
                      {filteredChronological.length < 15 || idx % 2 === 0 ? (
                        <text x={x} y={chartHeight - 20} textAnchor="middle" fill="#64748b" style={{ fontSize: 8 }}>
                          {new Date(q.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>
          </Section>

          {/* Table Logs list */}
          <Section title={`QC Log Records (${filteredRecent.length})`} pad={false}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Analyzer</th>
                  <th>Test</th>
                  <th>Level</th>
                  <th className="right">Observed Value</th>
                  <th className="right">Mean Target</th>
                  <th className="right">SD Target</th>
                  <th>Westgard Quality Flag</th>
                  <th>Remarks / Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecent.map((q) => {
                  // Find index in chronological list to run rules correctly
                  const chronIndex = filteredChronological.findIndex((c) => c.id === q.id);
                  const prevRuns = filteredChronological
                    .slice(0, chronIndex)
                    .reverse()
                    .map((it) => it.value);

                  const wg = runWestgardRules(q.value, q.mean, q.sd, prevRuns);
                  return (
                    <tr key={q.id}>
                      <td>{fmtDate(q.date)}</td>
                      <td>{q.analyzer}</td>
                      <td><b>{q.test}</b></td>
                      <td>
                        <span style={{ fontWeight: 600, color: q.level === "L1" ? "#1e293b" : q.level === "L2" ? "#3b82f6" : "#f43f5e" }}>
                          {q.level === "L1" ? "Level 1 (N)" : q.level === "L2" ? "Level 2 (H)" : "Level 3 (L)"}
                        </span>
                      </td>
                      <td className="right mono" style={{ fontWeight: 700 }}>{q.value}</td>
                      <td className="right mono muted">{q.mean}</td>
                      <td className="right mono muted">{q.sd}</td>
                      <td>
                        {wg ? (
                          <span className={`badge ${wg.cls}`}>{wg.flag}</span>
                        ) : (
                          <span className="badge badge-ok">✓ OK</span>
                        )}
                      </td>
                      <td className="muted">{q.remark ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        </div>
      )}
    </Page>
  );
}
