import { DICTIONARY } from "../lib/dictionary";
import { isSandboxMessage, PARENT_SOURCE, type SandboxToParent } from "../lib/messages";
import { sanitizeProfile, type ScanProfile } from "../lib/profile";
import { loadSettings, saveProfile } from "../lib/storage";

const statusEl = document.querySelector<HTMLElement>("#status");
const missingEl = document.querySelector<HTMLElement>("#missing");
const frame = document.querySelector<HTMLIFrameElement>("#scanner");
const profileEl = document.querySelector<HTMLElement>("#profile");

function setStatus(state: string, text: string): void {
  if (!statusEl) return;
  statusEl.dataset.state = state;
  statusEl.textContent = text;
}

function renderProfile(profile: ScanProfile | null): void {
  if (!profileEl) return;
  profileEl.replaceChildren();
  if (!profile) {
    profileEl.textContent = "No scan yet.";
    profileEl.classList.add("muted");
    return;
  }
  profileEl.classList.remove("muted");
  const when = document.createElement("p");
  when.textContent = `Scanned ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(profile.scannedAt))}.`;
  profileEl.append(when);
  if (profile.skinType) {
    const skin = document.createElement("p");
    skin.textContent = `Skin type: ${profile.skinType}.`;
    profileEl.append(skin);
  }
  if (profile.problems.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No concerns scored above the matching threshold.";
    profileEl.append(empty);
    return;
  }
  const list = document.createElement("ul");
  for (const key of profile.problems) {
    const item = document.createElement("li");
    item.textContent = DICTIONARY[key].label;
    list.append(item);
  }
  profileEl.append(list);
}

function openOptions(event?: Event): void {
  event?.preventDefault();
  void chrome.runtime.openOptionsPage();
}

document.querySelector("#options-link")?.addEventListener("click", openOptions);
document.querySelector("#open-options")?.addEventListener("click", openOptions);

async function reloadScanner(clientId: string): Promise<void> {
  if (!frame || !missingEl) return;
  missingEl.hidden = true;
  frame.hidden = false;
  setStatus("starting", "Starting the Face Age scanner…");
  frame.src = "sandbox.html";
  const send = () => {
    frame.contentWindow?.postMessage({ source: PARENT_SOURCE, type: "config", clientId }, "*");
  };
  frame.addEventListener("load", send, { once: true });
}

async function boot(): Promise<void> {
  const settings = await loadSettings();
  renderProfile(settings.profile);
  if (!settings.clientId) {
    setStatus("needs-client-id", "A Client ID is required before the camera can open.");
    if (missingEl) missingEl.hidden = false;
    if (frame) frame.hidden = true;
    return;
  }
  await reloadScanner(settings.clientId);
}

document.querySelector("#rescan")?.addEventListener("click", () => {
  void boot();
});

window.addEventListener("message", (event) => {
  if (event.source !== frame?.contentWindow) return;
  if (!isSandboxMessage(event.data)) return;
  void onSandbox(event.data);
});

async function onSandbox(message: SandboxToParent): Promise<void> {
  if (message.type === "ready") {
    const settings = await loadSettings();
    if (!settings.clientId || !frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      { source: PARENT_SOURCE, type: "config", clientId: settings.clientId },
      "*",
    );
    return;
  }
  if (message.type === "started") {
    setStatus("ready", "Scanner is ready. Use the camera or upload a photo inside the panel.");
    return;
  }
  if (message.type === "reset") {
    setStatus("ready", "The widget was reset. Your saved profile stays until a new scan finishes.");
    return;
  }
  if (message.type === "error") {
    setStatus("error", message.message);
    return;
  }
  if (message.type === "profile") {
    const profile = sanitizeProfile(message.profile);
    if (!profile) {
      setStatus("error", "The scan result could not be stored.");
      return;
    }
    await saveProfile(profile);
    renderProfile(profile);
    const count = profile.problems.length;
    setStatus(
      "saved",
      count
        ? `Scan saved. ${count} concern${count === 1 ? "" : "s"} will be used on supported stores.`
        : "Scan saved. Nothing scored high enough to badge products.",
    );
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.profile) return;
  if (changes.profile.newValue == null) {
    renderProfile(null);
    return;
  }
  renderProfile(sanitizeProfile(changes.profile.newValue));
});

void boot();
