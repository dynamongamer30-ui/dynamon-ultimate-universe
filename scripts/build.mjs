import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Use Node to pass environment variables consistently on Windows and Linux.
for (const script of ["./generate-sitemap.mjs", "../node_modules/vite/bin/vite.js"]) {
  const args = [fileURLToPath(new URL(script, import.meta.url))];
  if (script.includes("vite")) args.push("build");
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, NITRO_COMPATIBILITY_DATE: "2026-08-22" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
