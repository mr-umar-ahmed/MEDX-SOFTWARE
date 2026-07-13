import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as os from "os";
import * as net from "net";
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
