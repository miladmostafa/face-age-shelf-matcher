import { describe, expect, it } from "vitest";
import {
  CHART_END,
  CHART_START,
  patchFaceAgeBundle,
  patchMediaPipeWasm,
  TEXT_REPLACEMENTS,
} from "../scripts/patch-faceage.mjs";

const IFRAME_CREATE = 'i.dom.elIframe=document.createElement("iframe")';

const SWIPER_211 = [
  'var f=document.createElement("script");f.type="text/javascript",f.text="new Swiper(\'.myProductProblem\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 6,\\n"+_k+"        });",n.dom.elRoutines.routine.appendChild(f)',
  'var r=document.createElement("script");r.type="text/javascript",r.text="new Swiper(\'.myProductProblem\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 6,\\n"+_k+"        });",n.dom.elRecommendation.products.appendChild(r)',
  'var l=document.createElement("script");l.type="text/javascript",l.text="new Swiper(\'."+(this.recommendation?"myProducts":"mySwiper")+"\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 12,\\n"+_k+\'            navigation: {\\n               nextEl: ".swiper-button-next",\\n               prevEl: ".swiper-button-prev",\\n            },\\n        });\',t.appendChild(l)',
].join("\n");

const SWIPER_213 = [
  'var h=document.createElement("script");h.type="text/javascript",h.text="new Swiper(\'.myProductProblem\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 6,\\n"+bk+"        });",n.dom.elRoutines.routine.appendChild(h)',
  'var r=document.createElement("script");r.type="text/javascript",r.text="new Swiper(\'.myProductProblem\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 6,\\n"+bk+"        });",n.dom.elRecommendation.products.appendChild(r)',
  'var l=document.createElement("script");l.type="text/javascript",l.text="new Swiper(\'."+(this.recommendation?"myProducts":"mySwiper")+"\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 12,\\n"+bk+\'            navigation: {\\n               nextEl: ".swiper-button-next",\\n               prevEl: ".swiper-button-prev",\\n            },\\n        });\',t.appendChild(l)',
].join("\n");

const FIXTURE = [
  ...TEXT_REPLACEMENTS.map(([from]) => from),
  IFRAME_CREATE,
  `${CHART_START}IGNORED${CHART_END}`,
  SWIPER_213,
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
    expect(patched).toContain(IFRAME_CREATE);
    expect(patched).toContain("frame.contentDocument");
    expect(patched).toContain("view.Swiper");
    expect(patched).toContain("view.Chart");
    expect(patched).not.toContain("https://cdn.jsdelivr.net");
    expect(patched).not.toContain("new Function");
    expect(patched).not.toContain('setAttribute("crossorigin","anonymous")');
    expect(patched).not.toContain("data-faceage-root");
    expect(patched).not.toContain(".text=");
    expect(patched).toContain("position: relative; z-index: 1; opacity: 1;");
    expect(patched).toContain("(window.top||window).document.body.appendChild(t)");
  });

  it("rewrites the 2.4.11 Swiper variable names the same way", () => {
    const patched = patchFaceAgeBundle(
      [
        ...TEXT_REPLACEMENTS.map(([from]) => from),
        IFRAME_CREATE,
        `${CHART_START}IGNORED${CHART_END}`,
        SWIPER_211,
      ].join("\n"),
    );
    expect(patched).toContain("view.Swiper");
    expect(patched).not.toContain(".text=");
  });
});

describe("patchMediaPipeWasm", () => {
  it("replaces embind new Function with a plain wrapper", () => {
    const patched = patchMediaPipeWasm(WASM_FIXTURE);
    expect(patched).toContain("createNamedFunction(name,body){return function()");
    expect(patched).not.toContain("new Function");
  });
});
