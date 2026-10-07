import { describe, expect, it } from "vitest";
import { patchFaceAgeBundle } from "../scripts/patch-faceage.mjs";

const FIXTURE = [
  'f.src="https://cdn.jsdelivr.net/npm/chart.js"',
  'm.src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"',
  'd.href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"',
  'locateFile:function(e){return"https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.3/".concat(e)}',
  "for(;t>-1&&(!e||!/^https?:/.test(e));)",
  'i.dom.elIframe=document.createElement("iframe")',
  "position: relative; z-index: 1; opacity: 0;",
].join("\n");

describe("patchFaceAgeBundle", () => {
  it("points chart and swiper at packaged files and keeps MediaPipe on the CDN", () => {
    const patched = patchFaceAgeBundle(FIXTURE);
    expect(patched).toContain('"/vendor/chart/chart.umd.js"');
    expect(patched).toContain('"/vendor/swiper/swiper-bundle.min.js"');
    expect(patched).toContain('"/vendor/swiper/swiper-bundle.min.css"');
    expect(patched).toContain("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.3/");
    expect(patched).toContain("/^(https?:|chrome-extension:)/");
    expect(patched).toContain('elIframe=document.createElement("div")');
    expect(patched).toContain("contentDocument");
    expect(patched).not.toContain('elIframe=document.createElement("iframe")');
    expect(patched).toContain("position: relative; z-index: 1; opacity: 1;");
    expect(patched).not.toContain("position: relative; z-index: 1; opacity: 0;");
    expect(patched).not.toContain("https://cdn.jsdelivr.net/npm/chart.js");
  });
});
