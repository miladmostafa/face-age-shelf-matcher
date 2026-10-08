import { describe, expect, it } from "vitest";
import {
  CHART_END,
  CHART_START,
  patchFaceAgeBundle,
  patchMediaPipeWasm,
  TEXT_REPLACEMENTS,
} from "../scripts/patch-faceage.mjs";

const FIXTURE = [
  ...TEXT_REPLACEMENTS.map(([from]) => from),
  `${CHART_START}IGNORED${CHART_END}`,
].join("\n");

const WASM_FIXTURE =
  'function createNamedFunction(name,body){name=makeLegalFunctionName(name);return new Function("body","return function "+name+"() {\\n"+\'    "use strict";\'+"    return body.apply(this, arguments);\\n"+"};\\n")(body)}';

describe("patchFaceAgeBundle", () => {
  it("keeps Chart, Swiper, and MediaPipe local and drops inline scripts", () => {
    const patched = patchFaceAgeBundle(FIXTURE);
    expect(patched).toContain("/vendor/chart/chart.umd.js");
    expect(patched).toContain("/vendor/swiper/swiper-bundle.min.js");
    expect(patched).toContain("/vendor/swiper/swiper-bundle.min.css");
    expect(patched).toContain("/vendor/mediapipe/");
    expect(patched).toContain("/^(https?:|chrome-extension:)/");
    expect(patched).toContain('querySelector("#FaceAge-module [data-faceage-root]")');
    expect(patched).toContain("contentDocument");
    expect(patched).toContain('typeof Swiper=="function"&&new Swiper');
    expect(patched).toContain('typeof Chart==="function"');
    expect(patched).not.toContain("https://cdn.jsdelivr.net");
    expect(patched).not.toContain("new Function");
    expect(patched).not.toContain('setAttribute("crossorigin","anonymous")');
    expect(patched).not.toContain('elIframe=document.createElement("iframe")');
    expect(patched).not.toContain(".text=");
    expect(patched).toContain("position: relative; z-index: 1; opacity: 1;");
  });
});

describe("patchMediaPipeWasm", () => {
  it("replaces embind new Function with a plain wrapper", () => {
    const patched = patchMediaPipeWasm(WASM_FIXTURE);
    expect(patched).toContain("createNamedFunction(name,body){return function()");
    expect(patched).not.toContain("new Function");
  });
});
