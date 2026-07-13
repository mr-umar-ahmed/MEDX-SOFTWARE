import { build } from "esbuild";

async function buildScripts() {
  await build({
    entryPoints: ["electron/main.ts", "electron/preload.ts"],
    bundle: true,
    platform: "node",
    outdir: "dist-electron",
    outExtension: { ".js": ".cjs" },
    external: ["electron", "better-sqlite3"],
    format: "cjs",
    minify: true,
  });
  console.log("✓ Electron production bundle compiled inside dist-electron/.");
}

buildScripts().catch((err) => {
  console.error("Compilation failed:", err);
  process.exit(1);
});
