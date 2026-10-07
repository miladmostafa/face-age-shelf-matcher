/**
 * Adjust the published face-age bundle so it can run in a Manifest V3 sandbox.
 * Chart.js and Swiper are loaded from the extension package. MediaPipe stays on
 * jsDelivr because the SDK fetches WASM with crossorigin from a null origin.
 * The widget iframe would be a second opaque origin, so the SDK renders into this
 * document through a stand-in element instead.
 */

const REPLACEMENTS = [
  ["https://cdn.jsdelivr.net/npm/chart.js", "/vendor/chart/chart.umd.js"],
  [
    "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js",
    "/vendor/swiper/swiper-bundle.min.js",
  ],
  [
    "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
    "/vendor/swiper/swiper-bundle.min.css",
  ],
  ["!/^https?:/.test(e)", "!/^(https?:|chrome-extension:)/.test(e)"],
  [
    'i.dom.elIframe=document.createElement("iframe")',
    'i.dom.elIframe=document.createElement("div"),Object.defineProperty(i.dom.elIframe,"contentDocument",{get:function(){return document}}),Object.defineProperty(i.dom.elIframe,"contentWindow",{get:function(){return window}})',
  ],
  ["position: relative; z-index: 1; opacity: 0;", "position: relative; z-index: 1; opacity: 1;"],
];

const MEDIAPIPE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.3/";

export function patchFaceAgeBundle(source) {
  let next = source;
  for (const [from, to] of REPLACEMENTS) {
    if (!next.includes(from)) {
      throw new Error(`face-age bundle is missing expected snippet: ${from}`);
    }
    next = next.split(from).join(to);
  }
  if (!next.includes(MEDIAPIPE_URL)) {
    throw new Error("MediaPipe CDN URL was removed; the sandbox still needs it.");
  }
  if (next.includes("https://cdn.jsdelivr.net/npm/chart.js")) {
    throw new Error("Unpinned chart.js URL is still in the bundle.");
  }
  return next;
}
