import { DEFAULT_ALLOWLIST } from "../lib/domains";
import { shouldOpenOptionsOnInstall } from "../lib/onboarding";
import { loadSettings } from "../lib/storage";
import { syncExtraContentScripts } from "./register-scripts";

async function seedAndSync(): Promise<void> {
  const data = await chrome.storage.local.get("allowlist");
  if (!Array.isArray(data.allowlist)) {
    await chrome.storage.local.set({ allowlist: [...DEFAULT_ALLOWLIST] });
  }
  await syncExtraContentScripts();
}

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    await seedAndSync();
    const settings = await loadSettings();
    if (shouldOpenOptionsOnInstall(details.reason, settings.clientId)) {
      await chrome.runtime.openOptionsPage();
    }
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void syncExtraContentScripts();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== "sync-allowlist") return;
  syncExtraContentScripts()
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => {
      const text = error instanceof Error ? error.message : "Could not update site access.";
      console.error(text);
      sendResponse({ ok: false, message: text });
    });
  return true;
});
