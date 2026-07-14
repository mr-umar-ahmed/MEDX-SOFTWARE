import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("medx", {
  getStore: (key: string) => ipcRenderer.invoke("get-store", key),
  setStore: (key: string, value: string) => ipcRenderer.invoke("set-store", key, value),
  removeStore: (key: string) => ipcRenderer.invoke("remove-store", key),
  getHostname: () => ipcRenderer.invoke("get-hostname"),
  onAnalyzerRawData: (callback: (data: string) => void) => {
    ipcRenderer.on("analyzer-raw-data", (_event, data) => callback(data));
  },
  simulateTcpTransmission: (data: string) => ipcRenderer.invoke("simulate-tcp-transmission", data),
  onUpdaterStatus: (callback: (status: { status: string }) => void) => {
    ipcRenderer.on("updater-status", (_event, status) => callback(status));
  },
  onUpdaterProgress: (callback: (percent: number) => void) => {
    ipcRenderer.on("updater-progress", (_event, percent) => callback(percent));
  },
  installUpdate: () => ipcRenderer.invoke("install-update"),
  listSerialPorts: () => ipcRenderer.invoke("list-serial-ports"),
  connectSerialPort: (path: string, baudRate: number) => ipcRenderer.invoke("connect-serial-port", path, baudRate),
  disconnectSerialPort: () => ipcRenderer.invoke("disconnect-serial-port"),
  onSerialError: (callback: (err: string) => void) => {
    ipcRenderer.on("serial-error", (_event, err) => callback(err));
  }
});
