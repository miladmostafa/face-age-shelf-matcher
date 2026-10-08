/**
 * Adjust the published face-age bundle so it can run on a normal MV3 extension
 * page: local scripts only, no inline scripts, and no eval.
 * Chart.js, Swiper, and MediaPipe Face Mesh are loaded from the extension
 * package. The widget keeps its own about:blank iframe (#FaceAge-module-iframe)
 * and writes the scanner UI into that frame. MediaPipe scripts are added to the
 * top extension page so they compile under that page's wasm-unsafe-eval policy.
 */

const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.3/";
const MEDIAPIPE_LOCAL = "/vendor/mediapipe/";

const CHART_START =
  'var T=document.createElement("script");T.type="text/javascript",T.text="var ctx = document.getElementById(\'"+u+"\').getContext(\'2d\');';
const CHART_END = "r.dom.elSkinReport.appendChild(T)";

const SWIPER_OPTIONS =
  '{slidesPerView:"auto",spaceBetween:6,cssMode:!0,mousewheel:{forceToAxis:!0,releaseOnEdges:!0},simulateTouch:!1}';
const SWIPER_OPTIONS_WIDE =
  '{slidesPerView:"auto",spaceBetween:12,cssMode:!0,mousewheel:{forceToAxis:!0,releaseOnEdges:!0},simulateTouch:!1,navigation:{nextEl:".swiper-button-next",prevEl:".swiper-button-prev"}}';

function swiperInFrame(globals, selector, options) {
  return `(function(){var frame=${globals}.dom&&${globals}.dom.elIframe;var view=frame&&frame.contentWindow||window;var doc=frame&&frame.contentDocument||document;var el=doc.querySelector(${selector});if(el&&typeof view.Swiper==="function")new view.Swiper(el,${options})}).call(this)`;
}

const TEXT_REPLACEMENTS = [
  ["https://cdn.jsdelivr.net/npm/chart.js", "/vendor/chart/chart.umd.js"],
  [
    "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js",
    "/vendor/swiper/swiper-bundle.min.js",
  ],
  [
    "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
    "/vendor/swiper/swiper-bundle.min.css",
  ],
  [MEDIAPIPE_CDN, MEDIAPIPE_LOCAL],
  ["!/^https?:/.test(e)", "!/^(https?:|chrome-extension:)/.test(e)"],
  ['new Function("return this")', "window"],
  [
    't.setAttribute("src",e),t.setAttribute("crossorigin","anonymous"),document.body.appendChild(t)',
    't.setAttribute("src",e),(window.top||window).document.body.appendChild(t)',
  ],
  ["position: relative; z-index: 1; opacity: 0;", "position: relative; z-index: 1; opacity: 1;"],
  [
    'var f=document.createElement("script");f.type="text/javascript",f.text="new Swiper(\'.myProductProblem\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 6,\\n"+_k+"        });",n.dom.elRoutines.routine.appendChild(f)',
    swiperInFrame("n", '".myProductProblem"', SWIPER_OPTIONS),
  ],
  [
    'var r=document.createElement("script");r.type="text/javascript",r.text="new Swiper(\'.myProductProblem\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 6,\\n"+_k+"        });",n.dom.elRecommendation.products.appendChild(r)',
    swiperInFrame("n", '".myProductProblem"', SWIPER_OPTIONS),
  ],
  [
    'var l=document.createElement("script");l.type="text/javascript",l.text="new Swiper(\'."+(this.recommendation?"myProducts":"mySwiper")+"\', {\\n            slidesPerView: \'auto\',\\n            spaceBetween: 12,\\n"+_k+\'            navigation: {\\n               nextEl: ".swiper-button-next",\\n               prevEl: ".swiper-button-prev",\\n            },\\n        });\',t.appendChild(l)',
    swiperInFrame("n", '"."+(this.recommendation?"myProducts":"mySwiper")', SWIPER_OPTIONS_WIDE),
  ],
];

const CREATE_NAMED_FUNCTION =
  'function createNamedFunction(name,body){name=makeLegalFunctionName(name);return new Function("body","return function "+name+"() {\\n"+\'    "use strict";\'+"    return body.apply(this, arguments);\\n"+"};\\n")(body)}';

const CHART_DIRECT =
  '(function(){var frame=r.dom&&r.dom.elIframe;var doc=frame&&frame.contentDocument||document;var view=frame&&frame.contentWindow||window;var ctx=doc.getElementById(u);if(ctx&&typeof view.Chart==="function"){var border=(null!==(_=null===(A=r.customTemplate)||void 0===A?void 0:A.base_color)&&void 0!==_?_:"rgba(239, 55, 134)");new view.Chart(ctx.getContext("2d"),{type:"radar",height:450,data:{labels:P,datasets:[{data:C,backgroundColor:"rgba(239, 55, 134, 0)",borderColor:border,borderWidth:1}]},options:{responsive:!0,plugins:{legend:{display:!1},tooltip:{enabled:!0}},scales:{r:{reverse:!0,min:0,max:100,ticks:{beginAtZero:!0,stepSize:20,display:!1,callback:function(value){return value}},pointLabels:{font:{size:10}}}},elements:{line:{tension:0.2}}}})}})()';

function replaceChartInline(source) {
  const start = source.indexOf(CHART_START);
  const end = start < 0 ? -1 : source.indexOf(CHART_END, start);
  if (start < 0 || end < 0) {
    throw new Error("face-age bundle is missing the inline Chart script.");
  }
  return source.slice(0, start) + CHART_DIRECT + source.slice(end + CHART_END.length);
}

export function patchFaceAgeBundle(source) {
  let next = source;
  for (const [from, to] of TEXT_REPLACEMENTS) {
    if (!next.includes(from)) {
      throw new Error(`face-age bundle is missing expected snippet: ${from.slice(0, 120)}`);
    }
    next = next.split(from).join(to);
  }
  next = replaceChartInline(next);
  if (next.includes("https://cdn.jsdelivr.net/npm/chart.js")) {
    throw new Error("Unpinned chart.js URL is still in the bundle.");
  }
  if (next.includes(MEDIAPIPE_CDN)) {
    throw new Error("MediaPipe CDN URL is still in the bundle.");
  }
  if (next.includes("new Function(")) {
    throw new Error("new Function is still in the face-age bundle.");
  }
  if (next.includes('setAttribute("crossorigin","anonymous")')) {
    throw new Error("crossorigin script loading is still in the face-age bundle.");
  }
  if (
    source.includes('i.dom.elIframe=document.createElement("iframe")') &&
    !next.includes('i.dom.elIframe=document.createElement("iframe")')
  ) {
    throw new Error("The widget iframe was removed.");
  }
  if (next.includes('.text="new Swiper') || next.includes(CHART_START)) {
    throw new Error("An inline Chart or Swiper script is still in the bundle.");
  }
  return next;
}

const CRAFT_INVOKER =
  "function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){var argCount=argTypes.length;if(argCount<2){throwBindingError('argTypes array size mismatch! Must at least get return value and \\'this\\' types!')}var isClassMethodFunc=argTypes[1]!==null&&classType!==null;var needsDestructorStack=false;for(var i=1;i<argTypes.length;++i){if(argTypes[i]!==null&&argTypes[i].destructorFunction===undefined){needsDestructorStack=true;break}}var returns=argTypes[0].name!=='void';var expected=argCount-2;return function(){if(arguments.length!==expected){throwBindingError('function '+humanName+' called with '+arguments.length+' arguments, expected '+expected+' args!')}var destructors=needsDestructorStack?[]:null;var wired=[];if(isClassMethodFunc){wired.push(argTypes[1].toWireType(destructors,this))}for(var i=0;i<expected;++i){wired.push(argTypes[i+2].toWireType(destructors,arguments[i]))}var rv=cppInvokerFunc.apply(null,[cppTargetFunc].concat(wired));if(needsDestructorStack){runDestructors(destructors)}else{for(var j=isClassMethodFunc?1:2;j<argTypes.length;++j){var argType=argTypes[j];if(argType&&argType.destructorFunction!==null){argType.destructorFunction(wired[isClassMethodFunc?j-1:j-2])}}}if(returns){return argTypes[0].fromWireType(rv)}}}";

const EMVAL_CALLER =
  "function __emval_get_method_caller(argCount,argTypes){var types=__emval_lookupTypes(argCount,argTypes);var retType=types[0];return __emval_addMethodCaller(function(handle,name,destructors,args){var argList=[];var offset=0;for(var i=0;i<argCount-1;++i){var arg=types[i+1].readValueFromPointer(args+offset);argList.push(arg);offset+=types[i+1].argPackAdvance}var rv=handle[name].apply(handle,argList);for(var j=0;j<argCount-1;++j){if(types[j+1].deleteObject){types[j+1].deleteObject(argList[j])}}if(!retType.isVoid){return retType.toWireType(destructors,rv)}})}";

function replaceMarked(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = start < 0 ? -1 : source.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error(`MediaPipe wasm bundle is missing ${label}.`);
  }
  return source.slice(0, start) + replacement + source.slice(end);
}

/** MediaPipe's embind helpers compile functions with new Function. Extension pages forbid that. */
export function patchMediaPipeWasm(source) {
  if (!source.includes(CREATE_NAMED_FUNCTION)) {
    throw new Error("MediaPipe wasm bundle is missing createNamedFunction.");
  }
  let next = source
    .split(CREATE_NAMED_FUNCTION)
    .join(
      'function createNamedFunction(name,body){return function(){"use strict";return body.apply(this,arguments)}}',
    );
  if (next.includes("function craftInvokerFunction")) {
    next = replaceMarked(
      next,
      "function craftInvokerFunction",
      "function heap32VectorToArray",
      CRAFT_INVOKER,
      "craftInvokerFunction",
    );
  }
  if (next.includes("function __emval_get_method_caller")) {
    next = replaceMarked(
      next,
      "function __emval_get_method_caller",
      "function __emval_incref",
      EMVAL_CALLER,
      "__emval_get_method_caller",
    );
  }
  if (next.includes("new Function(") || next.includes("new_(Function")) {
    throw new Error("A Function constructor call is still in the MediaPipe wasm bundle.");
  }
  return next;
}

export { CHART_END, CHART_START, TEXT_REPLACEMENTS };
