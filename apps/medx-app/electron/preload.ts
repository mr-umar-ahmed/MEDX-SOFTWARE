import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("medx", {
  getStore: (key: string) => ipcRenderer.invoke("get-store", key),
  setStore: (key: string, value: string) => ipcRenderer.invoke("set-store", key, value),
  removeStore: (key: string) => ipcRenderer.invoke("remove-store", key),
});
