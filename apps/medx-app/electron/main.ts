import { app, BrowserWindow, ipcMain, Menu, webContents } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as os from "os";
import * as net from "net";
import { initDb, getStore, setStore, removeStore } from "./db/db";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

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

  mainWindow.removeMenu(); // Removes default File/Edit/View menu bar

  // Child windows (e.g. the counter display opened from Queue/Tokens) get the
  // same chrome-less treatment as the main window.
  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: "allow",
    overrideBrowserWindowOptions: {
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  }));

  // Right-click context menu
  mainWindow.webContents.on("context-menu", () => {
    const contextMenu = Menu.buildFromTemplate([
      { role: "copy" },
      { role: "paste" },
      { type: "separator" },
      { role: "toggleDevTools", label: "Developer Tools" },
    ]);
    contextMenu.popup({ window: mainWindow as BrowserWindow });
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // Removed auto openDevTools() popup
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

  // Check for updates
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

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

  // Cross-window relay: forwards a renderer's broadcast (e.g. queue updates)
  // to every other window, so the counter display stays live.
  ipcMain.on("medx-broadcast", (event, payload: string) => {
    for (const wc of webContents.getAllWebContents()) {
      if (wc.id !== event.sender.id && !wc.isDestroyed()) {
        wc.send("medx-broadcast", payload);
      }
    }
  });

  // Auto updater events
  autoUpdater.on("update-available", () => {
    if (mainWindow) mainWindow.webContents.send("updater-status", { status: "available" });
  });
  autoUpdater.on("download-progress", (progressObj) => {
    if (mainWindow) mainWindow.webContents.send("updater-progress", progressObj.percent);
  });
  autoUpdater.on("update-downloaded", () => {
    if (mainWindow) mainWindow.webContents.send("updater-status", { status: "downloaded" });
  });

  // Renderer can trigger install
  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle("get-hostname", () => {
    return os.hostname();
  });

  ipcMain.handle("simulate-tcp-transmission", (_event, data: string) => {
    return new Promise<void>((resolve, reject) => {
      const client = net.createConnection({ port: 8100 }, () => {
        client.write(data);
        client.end();
        resolve();
      });
      client.on("error", (err) => {
        reject(err);
      });
    });
  });

  // Start TCP Server on Port 8100 to listen for Lab Analyzers (HL7 / ASTM)
  let tcpServer: net.Server | null = null;
  try {
    tcpServer = net.createServer((socket) => {
      console.log("Lab Analyzer machine connected to socket.");
      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
      });
      socket.on("end", () => {
        console.log("Connection ended. Received raw machine data:\n", buffer);
        if (mainWindow && buffer.trim()) {
          mainWindow.webContents.send("analyzer-raw-data", buffer);
        }
      });
      socket.on("error", (err) => {
        console.error("Machine socket communication error:", err);
      });
    });
    tcpServer.listen(8100, () => {
      console.log("✓ Lab Analyzer TCP Server listening on port 8100");
    });
  } catch (err) {
    console.error("Failed to start Lab Analyzer TCP Server:", err);
  }

  // --- Serial Port Logic ---
  let activeSerialPort: any = null;

  ipcMain.handle("list-serial-ports", async () => {
    try {
      // Lazy import to avoid issues if not built properly
      const { SerialPort } = require("serialport");
      const ports = await SerialPort.list();
      return ports.map((p: any) => ({ path: p.path, manufacturer: p.manufacturer }));
    } catch (err: any) {
      console.error("Failed to list serial ports", err);
      return [];
    }
  });

  ipcMain.handle("connect-serial-port", async (_event, pathStr: string, baudRate: number) => {
    return new Promise((resolve) => {
      try {
        const { SerialPort } = require("serialport");
        if (activeSerialPort && activeSerialPort.isOpen) {
          activeSerialPort.close();
        }

        activeSerialPort = new SerialPort({ path: pathStr, baudRate: baudRate }, (err: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }
          resolve({ success: true });
        });

        activeSerialPort.on("data", (data: Buffer) => {
          const str = data.toString("utf8");
          console.log(`[Serial ${pathStr}] Data received:`, str);
          if (mainWindow) {
            mainWindow.webContents.send("analyzer-raw-data", str);
          }
        });

        activeSerialPort.on("error", (err: any) => {
          console.error(`[Serial ${pathStr}] Error:`, err.message);
          if (mainWindow) {
            mainWindow.webContents.send("serial-error", err.message);
          }
        });
      } catch (err: any) {
        resolve({ success: false, error: err.message });
      }
    });
  });

  ipcMain.handle("disconnect-serial-port", async () => {
    return new Promise((resolve) => {
      if (activeSerialPort && activeSerialPort.isOpen) {
        activeSerialPort.close((err: any) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true });
        });
      } else {
        resolve({ success: true });
      }
    });
  });
  // --- End Serial Port Logic ---

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
