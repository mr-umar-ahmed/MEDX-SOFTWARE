import { useState } from "react";
import { useStore } from "../data/store";
import { parseAnalyzerFrame } from "../core/interfacing";

const SYSMEX_HEM_TEMPLATE = (barcode: string, wbc: string, rbc: string, hgb: string, plt: string) => `H|\\^&|||Sysmex|||||||P|1
P|1||PatientName
O|1|${barcode}||^^^CBC|||||||||||||||||||F
R|1|^^^WBC|${wbc}|10*3/uL||N|||F
R|2|^^^RBC|${rbc}|10*6/uL||N|||F
R|3|^^^HGB|${hgb}|g/dL||N|||F
R|4|^^^PLT|${plt}|10*3/uL||N|||F
L|1|N`;

const MINDRAY_BIO_TEMPLATE = (barcode: string, glu: string, cho: string) => `MSH|^~\\&|Mindray||MedX||${new Date().toISOString().substring(0, 10).replace(/-/g, "")}||ORU^R01|1|P|2.3
PID|1||PID123||AnonymousPatient
OBR|1||${barcode}|Panels|||||||||||||||||||F
OBX|1|NM|GLU^Glucose|${glu}|mg/dL||N|||F
OBX|2|NM|CHO^Cholesterol|${cho}|mg/dL||N|||F`;

export default function InterfacingPage() {
  const { interfacingLogs, orders, log } = useStore();

  // Find first active/collected order to make demo simple
  const firstActiveOrder = orders.find((o) => o.status !== "reported") || orders[0];
  const defaultBarcode = firstActiveOrder ? firstActiveOrder.accessionNo : "260714-0001";

  // Simulator State
  const [protocol, setProtocol] = useState<"ASTM" | "HL7">("ASTM");
  const [barcode, setBarcode] = useState(defaultBarcode);
  const [wbc, setWbc] = useState("7.8");
  const [rbc, setRbc] = useState("4.8");
  const [hgb, setHgb] = useState("14.2");
  const [plt, setPlt] = useState("250");
  const [glu, setGlu] = useState("98");
  const [cho, setCho] = useState("185");

  const [simulating, setSimulating] = useState(false);
  const [simAlert, setSimAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Selected Log detail State
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Compute raw template representation
  const rawPreview =
    protocol === "ASTM"
      ? SYSMEX_HEM_TEMPLATE(barcode, wbc, rbc, hgb, plt)
      : MINDRAY_BIO_TEMPLATE(barcode, glu, cho);

  async function handleSimulate() {
    setSimAlert(null);
    setSimulating(true);

    // Give a nice fake network latency delay
    setTimeout(async () => {
      try {
        if (window.medx?.simulateTcpTransmission) {
          await window.medx.simulateTcpTransmission(rawPreview);
          setSimAlert({
            type: "success",
            msg: `✓ End-to-End Loopback TCP Transfer Successful! Raw connection sent to localhost:8100. Results parsed & imported automatically.`,
          });
          log("interfacing.simulate", `Simulated ${protocol} connection for barcode: ${barcode}`);
        } else {
          // Fallback if not running in electron main window, parse it locally
          const parsed = parseAnalyzerFrame(rawPreview);
          if (parsed) {
            useStore.getState().importAnalyzerResults(parsed.barcode, parsed.results, rawPreview, parsed.protocol);
            setSimAlert({
              type: "success",
              msg: `[Browser Fallback] parsed & imported barcode ${parsed.barcode} locally.`,
            });
          } else {
            throw new Error("Unable to parse template data frame.");
          }
        }
      } catch (err: any) {
        setSimAlert({ type: "error", msg: `✕ Connection failed: ${err.message || String(err)}` });
      } finally {
        setSimulating(false);
      }
    }, 800);
  }

  const activeLogDetail = interfacingLogs.find((l) => l.id === selectedLogId);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white">📟 Instrument &amp; Analyzer Interfacing</h1>
          <p className="text-sm text-slate-400 mt-1">
            Expose and manage automatic result entry from physical medical analyzers connected via Serial COM or TCP/IP.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
          <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg px-4 py-2 text-xs font-bold font-mono">
            🟢 TCP SOCKET LISTENER: ACTIVE (Port 8100)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Telemetry Logs */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col min-h-[580px]">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">📡 Transmission Telemetry</h2>
            <span className="text-xs text-slate-500 font-mono">{interfacingLogs.length} frames captured</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {interfacingLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6 text-slate-500 space-y-4">
                <span className="text-4xl">📟</span>
                <div>
                  <div className="font-bold text-slate-400 text-sm">No transmissions detected</div>
                  <div className="text-xs text-slate-500 mt-1 max-w-sm">
                    Connect an analyzer to port 8100 or use the Machine Simulator on the right to transmit HL7/ASTM test data blocks.
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {interfacingLogs.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLogId(l.id)}
                    className={`p-4 cursor-pointer transition hover:bg-slate-800/30 flex justify-between items-center ${
                      selectedLogId === l.id ? "bg-slate-800/40 border-l-2 border-teal-500" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-sm">{l.barcode}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {l.protocol}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">
                        ID: {l.id} · Received at {new Date(l.at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="text-xs font-semibold text-slate-300">
                        {Object.keys(l.results).length} parameters
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          l.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : l.status === "not_found"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {l.status === "success"
                          ? "Imported"
                          : l.status === "not_found"
                          ? "Accession No Not Found"
                          : "Parse Error"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Telemetry Drawer */}
          {activeLogDetail && (
            <div className="border-t border-slate-800 p-5 bg-slate-950/40 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-sm">✓ Raw Frame Details for barcode: {activeLogDetail.barcode}</h3>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">Capturing raw serial/socket data stream</div>
                </div>
                <button onClick={() => setSelectedLogId(null)} className="text-slate-400 hover:text-slate-200">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Parsed Parameter Results</div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1">
                    {Object.entries(activeLogDetail.results).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">{k}:</span>
                        <span className="text-teal-400 font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Raw ASTM/HL7 Frame</div>
                  <pre className="bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[9px] text-slate-400 max-h-36 overflow-auto leading-tight">
                    {activeLogDetail.raw}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Machine Simulator */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">🔌 Machine Transmission Simulator</h2>
            <p className="text-xs text-slate-400 mt-1">
              Simulate actual physical analyzer connections transmitting HL7 / ASTM protocols.
            </p>
          </div>

          {simAlert && (
            <div
              className={`p-4 text-xs rounded-lg border leading-relaxed ${
                simAlert.type === "success"
                  ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                  : "bg-red-950/20 border-red-500/20 text-red-300"
              }`}
            >
              {simAlert.msg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Analyzer Protocol Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setProtocol("ASTM")}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    protocol === "ASTM"
                      ? "bg-teal-500/10 border-teal-500 text-teal-400"
                      : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white"
                  }`}
                >
                  Sysmex KX-21 (ASTM)
                </button>
                <button
                  onClick={() => setProtocol("HL7")}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    protocol === "HL7"
                      ? "bg-teal-500/10 border-teal-500 text-teal-400"
                      : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white"
                  }`}
                >
                  Mindray BS-200 (HL7)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Accession Barcode ID</label>
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 260714-0001"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Matches patient accession barcode to import results correctly.
              </span>
            </div>

            {/* ASTM parameters */}
            {protocol === "ASTM" ? (
              <div className="grid grid-cols-2 gap-3.5 bg-slate-950 p-4 border border-slate-850 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">WBC (10^3/uL)</label>
                  <input
                    type="text"
                    value={wbc}
                    onChange={(e) => setWbc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-teal-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">RBC (10^6/uL)</label>
                  <input
                    type="text"
                    value={rbc}
                    onChange={(e) => setRbc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-teal-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">HGB (g/dL)</label>
                  <input
                    type="text"
                    value={hgb}
                    onChange={(e) => setHgb(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-teal-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">PLT (10^3/uL)</label>
                  <input
                    type="text"
                    value={plt}
                    onChange={(e) => setPlt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-teal-300 font-mono focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              // HL7 parameters
              <div className="grid grid-cols-2 gap-3.5 bg-slate-950 p-4 border border-slate-850 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">GLU Glucose (mg/dL)</label>
                  <input
                    type="text"
                    value={glu}
                    onChange={(e) => setGlu(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-teal-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">CHO Cholesterol (mg/dL)</label>
                  <input
                    type="text"
                    value={cho}
                    onChange={(e) => setCho(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-teal-300 font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Raw Protocol Block Preview</label>
              <pre className="w-full h-36 bg-slate-950 border border-slate-850 rounded-lg p-2.5 font-mono text-[9.5px] text-teal-400 overflow-auto select-all leading-tight">
                {rawPreview}
              </pre>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className={`w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold py-3 rounded-lg text-xs tracking-wider uppercase shadow-md font-mono ${
                simulating ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {simulating ? "📡 Transferring via TCP socket..." : "🔌 Simulate TCP Transmission"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
