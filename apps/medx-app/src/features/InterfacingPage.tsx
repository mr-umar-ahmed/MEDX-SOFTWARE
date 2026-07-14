import { useState, useEffect } from "react";
import { useStore } from "../data/store";
import { Page, Empty } from "../ui/bits";
import { parseLisPayload } from "../core/lisParser";

export default function InterfacingPage() {
  const store = useStore();
  
  // Connection state
  const [ports, setPorts] = useState<Array<{ path: string; manufacturer?: string }>>([]);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [serialStatus, setSerialStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  
  // Raw Data Log
  const [rawLogs, setRawLogs] = useState<Array<{ time: Date; data: string; parsed: any }>>([]);
  
  // Mapping State
  const [selectedLog, setSelectedLog] = useState<number | null>(null);
  const [targetOrder, setTargetOrder] = useState<string>("");
  
  useEffect(() => {
    // Fetch available ports
    if (window.medx && window.medx.listSerialPorts) {
      window.medx.listSerialPorts().then(setPorts);
    }
    
    // Listen for incoming LIS data
    if (window.medx && window.medx.onAnalyzerRawData) {
      window.medx.onAnalyzerRawData((data) => {
        setRawLogs((prev) => {
          const parsed = parseLisPayload(data);
          return [{ time: new Date(), data, parsed }, ...prev].slice(0, 100);
        });
      });
    }
    
    if (window.medx && window.medx.onSerialError) {
      window.medx.onSerialError((err) => {
        alert("Serial Connection Error: " + err);
        setSerialStatus("disconnected");
      });
    }
  }, []);

  async function handleConnect() {
    if (!window.medx || !window.medx.connectSerialPort) return;
    setSerialStatus("connecting");
    const res = await window.medx.connectSerialPort(selectedPort, baudRate);
    if (res.success) {
      setSerialStatus("connected");
    } else {
      setSerialStatus("disconnected");
      alert("Failed to connect: " + res.error);
    }
  }

  async function handleDisconnect() {
    if (!window.medx || !window.medx.disconnectSerialPort) return;
    await window.medx.disconnectSerialPort();
    setSerialStatus("disconnected");
  }

  async function simulateTcp() {
    if (!window.medx || !window.medx.simulateTcpTransmission) return;
    // Example ASTM payload
    const astmPayload = `\x021H|\\^&|||MedX|||||LIS||P|1\r
2P|1||123456||Doe^John||19800101|M||||||\r
3O|1|SAMP999||^^^WBC\\^^^RBC\\^^^HGB|||||||N||||||||||||||O\r
4R|1|^^^WBC|7.5|10^3/uL|4.0-10.0|N|||||admin\r
5R|2|^^^RBC|4.2|10^6/uL|3.8-5.8|N|||||admin\r
6R|3|^^^HGB|12.5|g/dL|11.5-16.5|N|||||admin\r
7L|1|N\x03\x04`;
    await window.medx.simulateTcpTransmission(astmPayload);
  }

  function handleMapData(logIdx: number) {
    const log = rawLogs[logIdx];
    if (!targetOrder) {
      alert("Please select a target order.");
      return;
    }
    const order = store.orders.find(o => o.id === targetOrder);
    if (!order) return;
    
    const resultsMap: Record<string, string> = {};
    for (const r of log.parsed.results || []) {
      resultsMap[r.testCode] = r.value;
    }

    try {
      store.importAnalyzerResults(order.accessionNo, resultsMap, log.data, "ASTM");
      alert(`Successfully imported analyzer results to Order ${order.invoiceNo}.`);
      setTargetOrder("");
      setSelectedLog(null);
    } catch (e: any) {
      alert("Error mapping data: " + e.message);
    }
  }

  const pendingOrders = store.orders.filter(o => o.status !== "reported");

  return (
    <Page title="Machine Interfacing (LIS)" sub="Connect to cell counters and analyzers to auto-fetch results.">
      <div className="grid-2">
        <div className="card card-pad">
          <h3>Serial Port (RS232)</h3>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Connect via COM port for legacy or USB-serial machines.</div>
          
          <div className="field">
            <label>Select COM Port</label>
            <select className="input" value={selectedPort} onChange={(e) => setSelectedPort(e.target.value)} disabled={serialStatus === "connected"}>
              <option value="">-- Select Port --</option>
              {ports.map(p => (
                <option key={p.path} value={p.path}>{p.path} {p.manufacturer ? `(${p.manufacturer})` : ""}</option>
              ))}
            </select>
          </div>
          
          <div className="field">
            <label>Baud Rate</label>
            <select className="input" value={baudRate} onChange={(e) => setBaudRate(Number(e.target.value))} disabled={serialStatus === "connected"}>
              <option value={9600}>9600 (Standard)</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={115200}>115200</option>
            </select>
          </div>
          
          <div className="row" style={{ marginTop: 12 }}>
            {serialStatus !== "connected" ? (
              <button className="btn btn-primary" onClick={handleConnect} disabled={!selectedPort || serialStatus === "connecting"}>
                {serialStatus === "connecting" ? "Connecting..." : "Connect"}
              </button>
            ) : (
              <button className="btn btn-danger" onClick={handleDisconnect}>Disconnect</button>
            )}
            <button className="btn" onClick={() => window.medx?.listSerialPorts?.().then(setPorts)}>Refresh Ports</button>
          </div>
        </div>

        <div className="card card-pad">
          <h3>LAN / TCP Server</h3>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            MedX is currently listening on TCP Port <b>8100</b> for incoming ASTM/HL7 payloads from machines connected to the local network.
          </div>
          
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 4, fontSize: 13, color: "#475569" }}>
            <b>Machine Setup:</b> Configure your analyzer's host settings to send data to this PC's IP address on port 8100.
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={simulateTcp}>Test / Simulate TCP Transmission</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0 }}>Transmission Logs</h3>
        </div>
        
        {rawLogs.length === 0 ? (
          <Empty>No machine data received yet. Connect a machine or send a test payload.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rawLogs.map((log, i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap" }}>
                <div style={{ padding: "12px 16px", flex: 1, minWidth: 300, borderRight: "1px solid var(--border)" }}>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                    <b style={{ color: "var(--primary-dark)" }}>{log.time.toLocaleTimeString()}</b>
                    {log.parsed.sampleId ? (
                      <span className="badge badge-ok">Sample: {log.parsed.sampleId}</span>
                    ) : (
                      <span className="badge badge-warn">Unrecognized Format</span>
                    )}
                  </div>
                  
                  <div style={{ background: "#1e293b", color: "#a5b4fc", padding: 12, borderRadius: 4, fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                    {log.data.replace(/\r/g, "\\r\\n").replace(/\x02/g, "<STX>").replace(/\x03/g, "<ETX>").replace(/\x04/g, "<EOT>")}
                  </div>
                </div>
                
                {log.parsed.results && log.parsed.results.length > 0 && (
                  <div style={{ padding: "12px 16px", width: 300, background: "#f8fafc" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Extracted Results:</div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#475569" }}>
                      {log.parsed.results.map((r: any, idx: number) => (
                        <li key={idx}><b>{r.testCode}</b>: {r.value} {r.unit}</li>
                      ))}
                    </ul>
                    
                    <div style={{ marginTop: 16 }}>
                      {selectedLog === i ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <select className="input" value={targetOrder} onChange={(e) => setTargetOrder(e.target.value)}>
                            <option value="">Select Pending Order...</option>
                            {pendingOrders.map(o => (
                              <option key={o.id} value={o.id}>{o.invoiceNo} - {store.getPatient(o.patientId)?.name}</option>
                            ))}
                          </select>
                          <div className="row">
                            <button className="btn btn-primary" onClick={() => handleMapData(i)}>Map Data</button>
                            <button className="btn" onClick={() => setSelectedLog(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-sm btn-primary" onClick={() => { setSelectedLog(i); setTargetOrder(""); }}>
                          Map to Order
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
