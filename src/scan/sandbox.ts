import { PROBLEM_KEYS } from "../lib/problems";
import { buildProfile } from "../lib/profile";
import { isParentConfig, SANDBOX_SOURCE } from "../lib/messages";

/**
 * Manifest V3 extension pages cannot run the inline scripts or CDN scripts that
 * the published face-age build injects. This document is a sandboxed extension
 * page whose CSP allows those scripts. It has no chrome.* access, so the parent
 * page is the only place a profile is written — and only after sanitizing.
 */

const root = document.querySelector<HTMLElement>("#FaceAge-module");
let started = false;
let selections: Record<string, unknown> | null = null;

function post(message: Record<string, unknown>): void {
  parent.postMessage({ source: SANDBOX_SOURCE, ...message }, "*");
}

function start(clientId: string): void {
  if (started) return;
  const FaceAge = window.FaceAge;
  if (!FaceAge || !root) {
    post({ type: "error", message: "The Face Age SDK did not load inside the extension." });
    return;
  }
  started = true;
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
      const profile = buildProfile({
        analysis: data.analysis,
        activeSelections: data.activeSelections ?? selections,
      });
      if (!profile) {
        post({
          type: "error",
          message: "The scan finished without a readable concern list.",
        });
        return;
      }
      post({ type: "profile", profile });
    });
    void widget.onResetData(() => {
      post({ type: "reset" });
    });
  } catch (error) {
    started = false;
    const message = error instanceof Error ? error.message : "The scanner could not start.";
    post({ type: "error", message });
    return;
  }

  const timer = window.setInterval(() => {
    const mounted =
      root.querySelector("iframe, .face_age") ||
      document.getElementById("face-age-css") ||
      document.getElementById("faceAge-module-body");
    if (mounted) {
      window.clearInterval(timer);
      post({ type: "started" });
    }
  }, 100);
  window.setTimeout(() => window.clearInterval(timer), 15000);
}

window.addEventListener("message", (event) => {
  if (event.source !== parent || !isParentConfig(event.data)) return;
  start(event.data.clientId);
});

post({ type: "ready" });
