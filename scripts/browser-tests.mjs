// Test the production bundle on a temporary loopback server, with isolated profiles.
import { preview } from "vite";
import { spawn } from "node:child_process";
const server = await preview({
  preview: { host: "127.0.0.1", port: 0, strictPort: false },
});
const address = server.httpServer.address();
const base = `http://127.0.0.1:${address.port}`;
const run = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: "inherit",
      env: { ...process.env, SLOPESENSE_URL: base },
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${script} failed (${code})`)),
    );
  });
try {
  await run("scripts/live-smoke.mjs");
  await run("scripts/design-smoke.mjs");
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}
