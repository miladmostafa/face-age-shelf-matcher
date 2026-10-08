import { DICTIONARY } from "../lib/dictionary";
import { SETUP_MESSAGE, needsClientId } from "../lib/onboarding";
import { PROBLEM_KEYS } from "../lib/problems";
import { buildProfile, sanitizeProfile, type ScanProfile } from "../lib/profile";
import { loadSettings, saveProfile } from "../lib/storage";

const statusEl = document.querySelector<HTMLElement>("#status");
const missingEl = document.querySelector<HTMLElement>("#missing");
const setupCopy = document.querySelector<HTMLElement>("#setup-copy");
const moduleEl = document.querySelector<HTMLElement>("#FaceAge-module");
const profileEl = document.querySelector<HTMLElement>("#profile");

let selections: Record<string, unknown> | null = null;
let widgetStarted = false;

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

function widgetFrame(): HTMLIFrameElement | null {
  const frame = moduleEl?.querySelector("#FaceAge-module-iframe");
  return frame instanceof HTMLIFrameElement ? frame : null;
}

/** Parent styles do not apply inside the widget frame, so copy the body rule across. */
function pinWidgetBody(frame: HTMLIFrameElement): void {
  const doc = frame.contentDocument;
  if (!doc?.head || doc.getElementById("shelf-widget-body-style")) return;
  let css = "#faceAge-module-body{height:760px !important;position:relative}";
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule && rule.selectorText === "#faceAge-module-body") {
        css = rule.cssText;
      }
    }
  }
  const style = doc.createElement("style");
  style.id = "shelf-widget-body-style";
  style.textContent = css;
  doc.head.appendChild(style);
}

function watchUntilMounted(): void {
  const timer = window.setInterval(() => {
    const frame = widgetFrame();
    const doc = frame?.contentDocument;
    if (frame) pinWidgetBody(frame);
    const mounted =
      doc?.querySelector(".face_age, .getStartedBtn") ||
      doc?.getElementById("face-age-css") ||
      doc?.getElementById("faceAge-module-body");
    if (!mounted) return;
    window.clearInterval(timer);
    setStatus("ready", "Scanner is ready. Use the camera or upload a photo inside the panel.");
  }, 100);
  window.setTimeout(() => window.clearInterval(timer), 15000);
}

async function storeAnalysis(data: {
  analysis?: unknown;
  activeSelections?: Record<string, unknown> | null;
}): Promise<void> {
  const profile = buildProfile({
    analysis: data.analysis,
    activeSelections: data.activeSelections ?? selections,
  });
  if (!profile) {
    setStatus("error", "The scan finished without a readable concern list.");
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

function start(clientId: string): void {
  if (widgetStarted) return;
  const FaceAge = window.FaceAge;
  if (!FaceAge || !moduleEl) {
    setStatus("error", "The Face Age SDK did not load.");
    return;
  }
  widgetStarted = true;
  if (missingEl) missingEl.hidden = true;
  moduleEl.hidden = false;
  setStatus("starting", "Starting the Face Age scanner…");
  try {
    const widget = new FaceAge({
      elementId: "FaceAge-module",
      faceageId: clientId,
      displayModel: "section",
      language: "en",
      height: "760px",
      quiz: false,
      history: false,
      showProducts: false,
      showRoutine: false,
      showCamera: true,
      showUpload: true,
      problems: [...PROBLEM_KEYS],
      gtag: null,
      gtagInsert: false,
      fbPixel: null,
      fbPixelInsert: false,
    });
    void widget.render();
    void widget.API.getActiveSelections((data) => {
      selections = data;
    });
    void widget.API.getAdvisorData((data) => {
      void storeAnalysis(data);
    });
    void widget.onResetData(() => {
      setStatus(
        "ready",
        "The widget was reset. Your saved profile stays until a new scan finishes.",
      );
    });
  } catch (error) {
    widgetStarted = false;
    const message = error instanceof Error ? error.message : "The scanner could not start.";
    setStatus("error", message);
    return;
  }
  watchUntilMounted();
}

async function boot(): Promise<void> {
  const settings = await loadSettings();
  renderProfile(settings.profile);
  if (needsClientId(settings.clientId)) {
    showMissingClientId();
    return;
  }
  start(settings.clientId);
}

function showMissingClientId(): void {
  setStatus(
    "needs-client-id",
    "Add a Face Age Client ID in the extension settings before scanning.",
  );
  if (setupCopy) setupCopy.textContent = SETUP_MESSAGE;
  if (missingEl) missingEl.hidden = false;
  if (moduleEl) moduleEl.hidden = true;
}

document.querySelector("#rescan")?.addEventListener("click", () => {
  location.reload();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.clientId) {
    const nextId = typeof changes.clientId.newValue === "string" ? changes.clientId.newValue : "";
    if (needsClientId(nextId)) {
      widgetStarted = false;
      showMissingClientId();
    } else if (!widgetStarted) {
      if (missingEl) missingEl.hidden = true;
      start(nextId);
    }
  }
  if (!changes.profile) return;
  if (changes.profile.newValue == null) {
    renderProfile(null);
    return;
  }
  renderProfile(sanitizeProfile(changes.profile.newValue));
});

void boot();
