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

// --- LAN Multi-Counter Synchronizer ---
let activeLanServer: net.Server | null = null;
let activeClients: net.Socket[] = [];
let clientSocket: net.Socket | null = null;
let currentRole = "standalone";
let currentHostIp = "";

function getLanSettings(): { lanRole: string; lanHostIp: string } {
  try {
    const rawStore = getStore("medx-store-v1");
    if (rawStore) {
      const storeObj = JSON.parse(rawStore);
      const settings = storeObj.state?.settings || {};
      return {
        lanRole: settings.lanRole || "standalone",
        lanHostIp: settings.lanHostIp || "127.0.0.1",
      };
    }
  } catch (e) {
    console.error("Error reading LAN settings from DB:", e);
  }
  return { lanRole: "standalone", lanHostIp: "127.0.0.1" };
}

function shutdownLanSync() {
  if (activeLanServer) {
    activeLanServer.close();
    activeLanServer = null;
    console.log("Shut down active LAN Sync Server.");
  }
  activeClients.forEach((s) => s.destroy());
  activeClients = [];

  if (clientSocket) {
    clientSocket.destroy();
    clientSocket = null;
    console.log("Disconnected LAN Sync Client.");
  }
}

function broadcastToClients(msg: any, excludeSocket?: net.Socket) {
  const payload = JSON.stringify(msg) + "\n";
  activeClients.forEach((socket) => {
    if (socket !== excludeSocket && !socket.destroyed) {
      socket.write(payload);
    }
  });
}

function relayToLocalRenderers(value: string) {
  try {
    const storeObj = JSON.parse(value);
    const syncPayload = {
      type: "queue",
      tokens: storeObj.state?.tokens || [],
      seq: storeObj.state?.seq || {},
    };
    const payloadStr = JSON.stringify(syncPayload);
    for (const wc of webContents.getAllWebContents()) {
      if (!wc.isDestroyed()) {
        wc.send("medx-broadcast", payloadStr);
      }
    }
  } catch (e) {
    console.error("Error relaying store broadcast locally:", e);
  }
}

let reconnectTimeout: any = null;
function connectToHost(hostIp: string) {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  clientSocket = net.createConnection({ host: hostIp, port: 8095 }, () => {
    console.log("✓ Connected to LAN Sync Host.");
  });

  let buffer = "";
  clientSocket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if ((msg.type === "init" || msg.type === "broadcast") && msg.value) {
          setStore("medx-store-v1", msg.value);
          relayToLocalRenderers(msg.value);
        }
      } catch (e) {
        console.error("Error parsing LAN Host broadcast frame:", e);
      }
    }
  });

  clientSocket.on("close", () => {
    console.log("LAN Sync connection closed. Reconnecting in 5 seconds...");
    if (currentRole === "client") {
      reconnectTimeout = setTimeout(() => connectToHost(hostIp), 5000);
    }
  });

  clientSocket.on("error", (err) => {
    console.error("LAN Sync Client connection error:", err.message);
  });
}

function initLanSync(role: string, hostIp: string) {
  if (role === currentRole && hostIp === currentHostIp) return;
  
  shutdownLanSync();
  
  currentRole = role;
  currentHostIp = hostIp;

  if (role === "host") {
    console.log("Initializing LAN Sync Server on port 8095...");
    activeLanServer = net.createServer((socket) => {
      activeClients.push(socket);
      console.log("LAN Sync Client connected:", socket.remoteAddress);

      // Send initial store data
      const rawStore = getStore("medx-store-v1");
      if (rawStore) {
        socket.write(JSON.stringify({ type: "init", value: rawStore }) + "\n");
      }

      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "set" && msg.value) {
              setStore("medx-store-v1", msg.value);
              broadcastToClients({ type: "broadcast", value: msg.value }, socket);
              relayToLocalRenderers(msg.value);
            }
          } catch (e) {
            console.error("Error parsing LAN client NDJSON:", e);
          }
        }
      });

      socket.on("close", () => {
        activeClients = activeClients.filter((s) => s !== socket);
        console.log("LAN Sync Client disconnected.");
      });

      socket.on("error", (err) => {
        console.error("LAN Sync Server socket error:", err);
      });
    });

    activeLanServer.listen(8095, "0.0.0.0", () => {
      console.log("✓ LAN Sync Server listening on port 8095");
    });
  } else if (role === "client") {
    console.log(`Connecting to LAN Sync Host at ${hostIp}:8095...`);
    connectToHost(hostIp);
  }
}

app.whenReady().then(() => {
  // Initialize local SQLite database
  initDb(app.getPath("userData"));

  // Check for updates
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  // Initialize LAN sync engine from startup config
  const initialLan = getLanSettings();
  initLanSync(initialLan.lanRole, initialLan.lanHostIp);

  // Bind IPC database calls
  ipcMain.handle("get-store", (_event, key: string) => {
    return getStore(key);
  });

  ipcMain.handle("set-store", (_event, key: string, value: string) => {
    setStore(key, value);
    if (key === "medx-store-v1") {
      // If we are Host, broadcast to other counters
      if (currentRole === "host") {
        broadcastToClients({ type: "broadcast", value });
      }
      // If we are Client, push to Host PC
      else if (currentRole === "client" && clientSocket && !clientSocket.destroyed) {
        clientSocket.write(JSON.stringify({ type: "set", value }) + "\n");
      }

      // Intercept and update LAN configuration if modified by user settings
      try {
        const storeObj = JSON.parse(value);
        const settings = storeObj.state?.settings || {};
        const newRole = settings.lanRole || "standalone";
        const newIp = settings.lanHostIp || "127.0.0.1";
        initLanSync(newRole, newIp);
      } catch (e) {}
    }
  });

  ipcMain.handle("remove-store", (_event, key: string) => {
    removeStore(key);
  });

  ipcMain.handle("get-hostname", () => {
    return os.hostname();
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
