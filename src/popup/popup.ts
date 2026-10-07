import { DICTIONARY } from "../lib/dictionary";
import { loadSettings } from "../lib/storage";

const summary = document.querySelector<HTMLElement>("#summary");

function render(): void {
  void loadSettings().then((settings) => {
    if (!summary) return;
    summary.replaceChildren();
    if (!settings.clientId) {
      summary.textContent = "Add a Face Age Client ID in Options before scanning.";
      return;
    }
    if (!settings.profile) {
      summary.textContent = "No scan saved yet. Open the scanner to use your camera or a photo.";
      return;
    }
    summary.classList.remove("muted");
    const when = document.createElement("p");
    when.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(settings.profile.scannedAt));
    summary.append(when);
    if (settings.profile.skinType) {
      const skin = document.createElement("p");
      skin.textContent = `Skin type: ${settings.profile.skinType}`;
      summary.append(skin);
    }
    if (settings.profile.problems.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No concerns were above the matching threshold.";
      summary.append(empty);
      return;
    }
    const list = document.createElement("ul");
    for (const key of settings.profile.problems) {
      const item = document.createElement("li");
      item.textContent = DICTIONARY[key].label;
      list.append(item);
    }
    summary.append(list);
  });
}

document.querySelector("#scan")?.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("src/scan/scan.html") });
});

document.querySelector("#options")?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

render();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.profile || changes.clientId)) render();
});
