import { build } from "esbuild";
import { spawn } from "child_process";
import electron from "electron";

async function buildScripts() {
  await build({
    entryPoints: ["electron/main.ts", "electron/preload.ts"],
    bundle: true,
    platform: "node",
    outdir: "dist-electron",
    outExtension: { ".js": ".cjs" },
    external: ["electron", "better-sqlite3"],
    format: "cjs",
  });
}

// Start Vite dev server in the background
const vite = spawn("npx", ["vite"], { stdio: "inherit", shell: true });

// Wait 2.5 seconds for Vite to boot, then compile main/preload and run electron
setTimeout(async () => {
  try {
    await buildScripts();
    const proc = spawn(electron, ["dist-electron/main.cjs"], { stdio: "inherit" });
    proc.on("close", () => {
      vite.kill();
      process.exit();
    });
  } catch (err) {
    console.error("Failed to build electron scripts:", err);
    vite.kill();
    process.exit(1);
  }
}, 2500);
