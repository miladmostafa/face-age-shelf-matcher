import { customDomains, domainToMatches } from "../lib/domains";
import { loadSettings } from "../lib/storage";

export const EXTRA_SCRIPT_ID = "shelf-matcher-extra";

export async function syncExtraContentScripts(): Promise<void> {
  const { allowlist } = await loadSettings();
  const extras = customDomains(allowlist);
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [EXTRA_SCRIPT_ID] });
  } catch {
    // The extra script is not registered yet.
  }
  if (extras.length === 0) return;

  const manifest = chrome.runtime.getManifest();
  const bundled = manifest.content_scripts?.[0];
  if (!bundled?.js?.length) {
    throw new Error("The built extension has no content script to reuse.");
  }

  await chrome.scripting.registerContentScripts([
    {
      id: EXTRA_SCRIPT_ID,
      js: [...bundled.js],
      css: bundled.css ? [...bundled.css] : [],
      matches: extras.flatMap(domainToMatches),
      runAt: "document_idle",
      persistAcrossSessions: true,
    },
  ]);
}
