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
});
