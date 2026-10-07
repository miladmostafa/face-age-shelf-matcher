import {
  customDomains,
  domainToMatches,
  formatAllowlist,
  normalizeClientId,
  parseAllowlistText,
} from "../lib/domains";
import { COUNT_SCORE_THRESHOLD, PERCENT_SCORE_THRESHOLD } from "../lib/profile";
import { deleteScanData, loadSettings, saveSettings } from "../lib/storage";

const form = document.querySelector<HTMLFormElement>("#settings");
const clientInput = document.querySelector<HTMLInputElement>("#client-id");
const allowlistInput = document.querySelector<HTMLTextAreaElement>("#allowlist");
const statusEl = document.querySelector<HTMLElement>("#status");
const privacyEl = document.querySelector<HTMLElement>("#privacy");
const thresholdEl = document.querySelector<HTMLElement>("#threshold");

function setStatus(tone: "ok" | "bad" | "", text: string): void {
  if (!statusEl) return;
  statusEl.dataset.tone = tone;
  statusEl.textContent = text;
}

if (privacyEl) {
  privacyEl.textContent =
    "Photos are analyzed by the Face Age cloud and are not saved here. Delete my data removes the saved concern list, skin type, and scan time. Analytics scripts from the scanner SDK are turned off.";
}

if (thresholdEl) {
  thresholdEl.textContent = `A concern is saved when its score is at least ${PERCENT_SCORE_THRESHOLD} out of 100. Acne is saved when the count is at least ${COUNT_SCORE_THRESHOLD}.`;
}

async function ensureCustomAccess(domains: string[]): Promise<boolean> {
  const extras = customDomains(domains);
  const missing: string[] = [];
  for (const domain of extras) {
    const origins = domainToMatches(domain);
    const already = await chrome.permissions.contains({ origins });
    if (!already) missing.push(domain);
  }
  if (missing.length === 0) return true;
  return chrome.permissions.request({ origins: missing.flatMap(domainToMatches) });
}

async function fill(): Promise<void> {
  const settings = await loadSettings();
  if (clientInput) clientInput.value = settings.clientId;
  if (allowlistInput) allowlistInput.value = formatAllowlist(settings.allowlist);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    const clientId = normalizeClientId(clientInput?.value ?? "");
    if (!clientId.ok) {
      setStatus("bad", clientId.message);
      return;
    }
    const parsed = parseAllowlistText(allowlistInput?.value ?? "");
    if (parsed.invalid.length > 0) {
      setStatus("bad", `Could not read: ${parsed.invalid.join(", ")}`);
      return;
    }
    const allowed = await ensureCustomAccess(parsed.domains);
    if (!allowed) {
      setStatus("bad", "Site permission was not granted, so the list was not changed.");
      return;
    }
    await saveSettings({ clientId: clientId.id, allowlist: parsed.domains });
    let sync: { ok?: boolean; message?: string } | undefined;
    try {
      sync = await chrome.runtime.sendMessage({ type: "sync-allowlist" });
    } catch {
      setStatus("bad", "Saved, but the background script did not answer.");
      return;
    }
    if (sync && sync.ok === false) {
      setStatus(
        "bad",
        typeof sync.message === "string" ? sync.message : "Saved, but site scripts did not update.",
      );
      return;
    }
    if (allowlistInput) allowlistInput.value = formatAllowlist(parsed.domains);
    setStatus("ok", "Saved.");
  })();
});

document.querySelector("#rescan")?.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("src/scan/scan.html") });
});

document.querySelector("#delete")?.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Delete the saved scan from this browser? Your Client ID and store list stay. Photos were never stored here.",
  );
  if (!confirmed) return;
  void deleteScanData().then(() => setStatus("ok", "Saved scan deleted."));
});

void fill();
