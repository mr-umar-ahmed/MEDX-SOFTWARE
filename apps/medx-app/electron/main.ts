import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as os from "os";
import { initDb, getStore, setStore, removeStore } from "./db/db";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "MedX — Pathology Lab Management",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize local SQLite database
  initDb(app.getPath("userData"));

  // Bind IPC database calls
  ipcMain.handle("get-store", (_event, key: string) => {
    return getStore(key);
  });

  ipcMain.handle("set-store", (_event, key: string, value: string) => {
    setStore(key, value);
  });

  ipcMain.handle("remove-store", (_event, key: string) => {
    removeStore(key);
  });

  ipcMain.handle("get-hostname", () => {
    return os.hostname();
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
