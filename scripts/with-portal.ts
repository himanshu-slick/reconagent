// Starts the built portal, waits until it answers, runs the given command against it, then stops the portal.
// Usage: tsx scripts/with-portal.ts <command> [args...]
import { spawn } from "node:child_process";

const PORT = process.env.PORTAL_PORT ?? "3111";
const url = `http://localhost:${PORT}`;

async function waitUntilUp(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`portal did not come up on ${url}`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (process.env.PORTAL_URL) return run(cmd, args, process.env.PORTAL_URL);
  const portal = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", PORT], { cwd: "portal", stdio: "ignore" });
  try {
    await waitUntilUp();
    await run(cmd, args, url);
  } finally {
    portal.kill("SIGTERM");
  }
}

function run(cmd: string, args: string[], portalUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, PORTAL_URL: portalUrl } });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
