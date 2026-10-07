/**
 * Load the built extension and check the Face Age widget plus shelf badges.
 * Reads FACEAGE_CLIENT_ID from the environment or .env.local. Never prints it.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const chromePath = process.env.CHROME_PATH || "/tmp/cft/chrome-linux64/chrome";
const port = 9355;
const storePort = 8765;

function clientId() {
  const fromEnv = process.env.FACEAGE_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  const file = path.join(root, ".env.local");
  const text = readFileSync(file, "utf8");
  const line = text.split(/\r?\n/).find((item) => item.startsWith("FACEAGE_CLIENT_ID="));
  const value = line?.slice("FACEAGE_CLIENT_ID=".length).trim();
  if (!value) throw new Error("Set FACEAGE_CLIENT_ID in the environment or .env.local.");
  return value;
}

function scrub(text, secret) {
  return String(text).split(secret).join("[client-id]");
}

const secret = clientId();
const shots = path.join(root, "docs/screenshots");
mkdirSync(shots, { recursive: true });

const fixture = readFileSync(path.join(root, "tests/fixtures/store.html"));
const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(fixture);
});
await new Promise((resolve) => server.listen(storePort, "127.0.0.1", resolve));

const profileDir = mkdtempSync(path.join(tmpdir(), "shelf-chrome-"));
const chrome = spawn(
  chromePath,
  [
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${port}`,
    `--load-extension=${dist}`,
    `--disable-extensions-except=${dist}`,
    "--disable-features=DisableLoadExtensionCommandLineSwitch",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--host-resolver-rules=MAP sephora.com 127.0.0.1, MAP www.sephora.com 127.0.0.1`,
    "--window-size=1280,900",
    "about:blank",
  ],
  { stdio: "ignore", env: { ...process.env, DISPLAY: process.env.DISPLAY || ":1" } },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let timeoutDetail = "";

function fail(message) {
  const detail = timeoutDetail ? `\n${timeoutDetail}` : "";
  console.error(scrub(`${message}${detail}`, secret));
  chrome.kill("SIGKILL");
  server.close();
  process.exit(1);
}

process.on("uncaughtException", (error) => fail(error.stack || error.message));
process.on("unhandledRejection", (error) => fail(String(error)));

async function json(pathname, method = "GET") {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { method });
  if (!response.ok) throw new Error(`${method} ${pathname} -> ${response.status}`);
  return response.json();
}

await sleep(500);
let version;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    version = await json("/json/version");
    break;
  } catch {
    await sleep(250);
  }
}
if (!version) fail("Chrome DevTools did not open.");

const cdp = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  cdp.addEventListener("open", resolve);
  cdp.addEventListener("error", reject);
});

let nextId = 0;
const pending = new Map();
const sessions = new Map();
cdp.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
    return;
  }
  if (message.method === "Target.attachedToTarget") {
    sessions.set(message.params.sessionId, message.params.targetInfo);
  }
});

function send(method, params = {}, sessionId) {
  const id = (nextId += 1);
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    cdp.send(JSON.stringify(payload));
  });
}

await send("Target.setDiscoverTargets", { discover: true });
await send("Target.setAutoAttach", {
  autoAttach: true,
  waitForDebuggerOnStart: false,
  flatten: true,
});

async function waitFor(label, fn, timeout = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) return value;
    await sleep(300);
  }
  fail(`Timed out waiting for ${label}.`);
}

function sessionFor(predicate) {
  for (const [sessionId, info] of sessions) {
    if (predicate(info)) return { sessionId, info };
  }
  return null;
}

async function evaluate(sessionId, expression) {
  const result = await send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "evaluate failed");
  }
  return result.result?.value;
}

async function open(url) {
  const created = await json(`/json/new?${encodeURIComponent(url)}`, "PUT");
  return waitFor(url, async () =>
    sessionFor((info) => info.targetId === created.id || info.url === url),
  );
}

const extension = await waitFor("extension service worker", async () =>
  sessionFor((info) => info.type === "service_worker" && info.url.includes("service-worker")),
);
const extensionId = new URL(extension.info.url).host;
console.log(`Extension loaded: ${extensionId}`);

const options = await open(`chrome-extension://${extensionId}/src/options/options.html`);
await waitFor("options form", () =>
  evaluate(options.sessionId, "Boolean(document.querySelector('#settings'))"),
);
const allowlist = [
  "sephora.com",
  "ulta.com",
  "dermstore.com",
  "paulaschoice.com",
  "theordinary.com",
  "cultbeauty.com",
  "cultbeauty.co.uk",
  "lookfantastic.com",
  "lookfantastic.co.uk",
  "spacenk.com",
  "glossier.com",
  "beautybay.com",
  "yesstyle.com",
  "iherb.com",
  "theinkeylist.com",
].join("\\n");
await evaluate(
  options.sessionId,
  `(() => {
    document.querySelector("#client-id").value = ${JSON.stringify(secret)};
    document.querySelector("#allowlist").value = "${allowlist}";
    document.querySelector("#settings").requestSubmit();
    return true;
  })()`,
);
const saved = await waitFor("options save", () =>
  evaluate(options.sessionId, "document.querySelector('#status')?.textContent || ''"),
);
if (!String(saved).startsWith("Saved")) fail(`Options save failed: ${saved}`);
console.log("Options page saved the Client ID from the local env file.");

await evaluate(
  options.sessionId,
  `chrome.storage.local.set(${JSON.stringify({
    profile: {
      version: 1,
      scannedAt: 1_700_000_000_000,
      problems: ["dryness", "darkCircle"],
      skinType: "dry",
    },
  })})`,
);

const scan = await open(`chrome-extension://${extensionId}/src/scan/scan.html`);
const state = await waitFor(
  "scanner status",
  async () => {
    const value = await evaluate(
      scan.sessionId,
      "document.querySelector('#status')?.dataset.state || ''",
    );
    return value === "ready" || value === "error" || value === "saved" ? value : "";
  },
  30000,
);
const statusText = await evaluate(
  scan.sessionId,
  "document.querySelector('#status')?.textContent || ''",
);
console.log(`Scan status: ${state} — ${scrub(statusText, secret)}`);
if (state === "error") fail(`Scanner error: ${statusText}`);

await send("Page.enable", {}, scan.sessionId);

async function listFrames(sessionId) {
  const tree = await send("Page.getFrameTree", {}, sessionId);
  const frames = [];
  const walk = (node) => {
    if (node?.frame) frames.push(node.frame);
    for (const child of node?.childFrames || []) walk(child);
  };
  walk(tree.frameTree);
  return frames;
}

async function evalInFrame(sessionId, frameId, expression) {
  const world = await send(
    "Page.createIsolatedWorld",
    { frameId, worldName: "shelf-check", grantUniveralAccess: true },
    sessionId,
  );
  const result = await send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
      contextId: world.executionContextId,
    },
    sessionId,
  );
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(detail || "frame evaluate failed");
  }
  return result.result?.value;
}

const probe = `(() => {
  const text = document.body ? document.body.innerText.slice(0, 2000) : "";
  const frames = document.querySelectorAll("iframe").length;
  const resources = performance.getEntriesByType("resource").map((entry) => entry.name);
  return { text, frames, resources, href: location.href };
})()`;

let lastFrames = [];
const widget = await waitFor(
  "widget UI",
  async () => {
    const frames = await listFrames(scan.sessionId);
    lastFrames = frames.map((frame) => frame.url);
    const sandbox = frames.find((frame) => String(frame.url).includes("sandbox.html"));
    if (!sandbox) return null;
    const snapshots = [];
    for (const frame of frames) {
      if (frame.id === frames[0]?.id) continue;
      try {
        snapshots.push(await evalInFrame(scan.sessionId, frame.id, probe));
      } catch (error) {
        snapshots.push({
          text: "",
          frames: 0,
          resources: [],
          href: frame.url,
          error: String(error),
        });
      }
    }
    const text = snapshots.map((item) => item.text || item.error || "").join("\n");
    const resources = snapshots.flatMap((item) => item.resources || []);
    const iframeCount = snapshots.reduce((sum, item) => sum + (item.frames || 0), 0);
    const interesting = `${text} ${resources.join(" ")}`.toLowerCase();
    timeoutDetail = `Frames: ${lastFrames.join(" | ")}\nSample: ${text.replace(/\s+/g, " ").slice(0, 300)}`;
    const initialized =
      interesting.includes("authorize") ||
      interesting.includes("get started") ||
      interesting.includes("camera") ||
      interesting.includes("upload");
    if (iframeCount > 0 && initialized) {
      return { text, frames: iframeCount, resources, urls: lastFrames };
    }
    return null;
  },
  30000,
);

console.log(`Widget iframes: ${widget.frames}`);
console.log(`Widget text sample: ${scrub(widget.text, secret).replace(/\s+/g, " ").slice(0, 400)}`);
console.log(`Widget resources: ${scrub(JSON.stringify(widget.resources), secret)}`);
const interesting = `${widget.text} ${JSON.stringify(widget.resources)}`.toLowerCase();
if (
  !interesting.includes("authorize") &&
  !interesting.includes("get started") &&
  !interesting.includes("camera")
) {
  fail("The widget iframe mounted, but neither authorize nor the scanner UI was detected.");
}

await send("Page.enable", {}, scan.sessionId);
const scanShot = await send("Page.captureScreenshot", { format: "png" }, scan.sessionId);
writeFileSync(path.join(shots, "scan.png"), Buffer.from(scanShot.data, "base64"));

const popup = await open(`chrome-extension://${extensionId}/src/popup/popup.html`);
await waitFor("popup summary", async () => {
  const text = await evaluate(popup.sessionId, "document.body.innerText");
  return text?.includes("Dark circles") ? text : "";
});
await send("Page.enable", {}, popup.sessionId);
const popupShot = await send("Page.captureScreenshot", { format: "png" }, popup.sessionId);
writeFileSync(path.join(shots, "popup.png"), Buffer.from(popupShot.data, "base64"));
console.log("Popup lists the saved concerns.");

const store = await open(`http://sephora.com:${storePort}/store.html`);
const badges = await waitFor("product badges", () =>
  evaluate(store.sessionId, "document.querySelectorAll('.ssm-host').length"),
);
console.log(`Store fixture badges: ${badges}`);
if (badges < 2) fail(`Expected 2 badges, found ${badges}.`);
await send("Page.enable", {}, store.sessionId);
const storeShot = await send("Page.captureScreenshot", { format: "png" }, store.sessionId);
writeFileSync(path.join(shots, "store.png"), Buffer.from(storeShot.data, "base64"));

console.log("Widget check passed.");
chrome.kill("SIGKILL");
server.close();
cdp.close();
process.exit(0);
