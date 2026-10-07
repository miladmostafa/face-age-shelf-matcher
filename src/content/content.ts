import { applyProfile } from "./apply";
import { DEFAULT_ALLOWLIST, hostMatchesAllowlist } from "../lib/domains";
import { sanitizeProfile, type ScanProfile } from "../lib/profile";

type ViewState = {
  allowlisted: boolean;
  profile: ScanProfile | null;
};

async function readState(): Promise<ViewState> {
  const data = await chrome.storage.local.get(["profile", "allowlist"]);
  const allowlist = Array.isArray(data.allowlist)
    ? data.allowlist.filter((item): item is string => typeof item === "string")
    : [...DEFAULT_ALLOWLIST];
  return {
    allowlisted: hostMatchesAllowlist(location.hostname, allowlist),
    profile: sanitizeProfile(data.profile),
  };
}

function debounce(run: () => void): () => void {
  let timer = 0;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 150);
  };
}

async function start(): Promise<void> {
  let state = await readState();
  if (!state.allowlisted) return;

  const paint = () => {
    if (!state.allowlisted) {
      applyProfile(document, null);
      return;
    }
    applyProfile(document, state.profile);
  };
  paint();

  const schedule = debounce(paint);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || (!changes.profile && !changes.allowlist)) return;
    void readState().then((next) => {
      state = next;
      paint();
    });
  });
}

if (globalThis.chrome?.runtime?.id && globalThis.chrome.storage?.local) {
  void start();
}
