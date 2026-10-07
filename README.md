# Skincare Shelf Matcher

A Manifest V3 browser extension. You scan your face once with the [face-age](https://www.npmjs.com/package/face-age) widget. After that, product cards on beauty stores whose text mentions those concerns get a **Matches your scan** badge.

Matching is a keyword check against the product title and description. It is not a diagnosis, and a badge is not a recommendation to buy the product.

## Flow

1. Add a Face Age Client ID on the options page. It is stored in `chrome.storage.local` on this browser.
2. Open the scanner in a full tab so the camera permission prompt can appear. Take a photo or upload one.
3. The extension keeps a small profile: concern keys that scored above a threshold, skin type when the scan includes one, and the time of the scan. The photo is not stored.
4. Browse an allowlisted store. Matching product cards show a badge. Click it to see which concerns and words matched.

The toolbar popup shows the saved profile and links to the scanner and options.

![Scanner ready after a Client ID is saved](docs/screenshots/scan.png)

![Popup showing the concerns kept from a scan](docs/screenshots/popup.png)

![Matching product cards on an allowlisted store](docs/screenshots/store.png)

## Setup

Create a free Client ID at [panel.getfaceage.com](https://panel.getfaceage.com).

```bash
npm install
npm run build
```

`dist/` is an unpacked extension.

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `dist` folder.
4. Open the extension’s options, paste your Client ID, and save.
5. Open the scanner from the popup or the options page.

### Firefox

Firefox 128 or newer:

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select `dist/manifest.json`.
3. Use the options page the same way as in Chrome.

The extension id in Firefox is `skincare-shelf-matcher@getfaceage.com`. Temporary add-ons are removed when Firefox exits.

## Privacy

- The photo is uploaded to the Face Age cloud (`core.getfaceage.com`) for analysis. The scan page says this before you start.
- This extension writes only the profile described above. `history` is off in the widget so the SDK is not asked to keep scan photos in `localStorage`.
- The quiz inside the widget is off, so the extension does not run Face Age’s extra questions (allergy, routine length, and so on). Skin type is stored only when a result payload already includes it.
- Google Analytics and Facebook Pixel are not given ids, script insertion is turned off, and those hosts are not allowed by the scanner’s script policy.
- **Delete my data** on the options page removes the saved profile. The Client ID and store list stay until you clear them and save.
- Badges are keyword matches. They are not medical advice and they are not a product endorsement.

Concerns are kept when the score is at least 30 out of 100. Acne is kept when the count is at least 1. Both cutoffs live in `src/lib/profile.ts`.

## Stores

The extension ships with an allowlist of beauty retailers (Sephora, Ulta, Dermstore, Paula’s Choice, The Ordinary, Cult Beauty, Lookfantastic, Space NK, Glossier, Beauty Bay, YesStyle, iHerb, and The Inkey List). Edit the list in options. Sites that are not in that default set need an extra permission prompt.

Removing a default site stops badging there. Chrome still lists that site under the extension’s required access, because required host permissions cannot be revoked from the options page. The content script checks the saved list and does nothing when the site is not on it.

## Manifest V3 and the Face Age SDK

`face-age` 2.4.11 is a browser widget. `new FaceAge(options).render()` needs a DOM, a camera or an upload, a network connection, and a Client ID. MediaPipe Face Mesh runs in the page for face and pose checks, then the photo is uploaded to the Face Age API. The published package is minified. `package.json` points `types` at `dist/FaceAge.d.ts`, but that file is not in the tarball, so this repo has a small hand-written declaration in `src/types/face-age.d.ts`.

The widget also:

- injects Chart.js, Swiper, and MediaPipe Face Mesh from jsDelivr
- injects **inline** scripts to construct the radar chart and carousels
- loads CSS from `static.getfaceage.com`, jsDelivr, and Google Fonts
- can inject Google Analytics or Facebook Pixel when those ids are set, including ids returned by the account

A normal MV3 extension page cannot allow that. Its `script-src` cannot include remote hosts, `'unsafe-inline'`, or `'unsafe-eval'`.

The scanner therefore runs in a **sandboxed extension page** (`src/scan/sandbox.html`), which is the MV3 escape hatch for pages that must run legacy widgets:

- The sandbox content security policy allows `'unsafe-inline'`, `'wasm-unsafe-eval'`, and scripts from `'self'` and `https://cdn.jsdelivr.net` only.
- The parent scan page is a normal extension page. It holds `chrome.storage` and the privacy notice. The sandbox has no `chrome.*` access. It posts back a profile object, and the parent saves it only after rebuilding it from known concern keys, an optional short skin-type string, and a timestamp.
- Chart.js 4.4.6 and Swiper 11 are copied into the extension at build time. The minified SDK is patched to load those files from the package instead of the unpinned Chart.js CDN URL. See `scripts/patch-faceage.mjs`.
- MediaPipe Face Mesh stays on jsDelivr. The SDK fetches its WASM with `crossorigin="anonymous"` from inside the widget iframe. A sandboxed page has a `null` origin, and extension files do not answer that cross-origin fetch. jsDelivr sends `Access-Control-Allow-Origin: *`, which the fetch accepts. That is remote code, limited to that one host, and it is called out here on purpose.
- Stylesheets (Face Age CSS, Swiper CSS is packaged, Google Fonts) are not scripts. Face Age’s own CSS still comes from `static.getfaceage.com`.
- The Face Age API allows `Access-Control-Allow-Origin: *`, so the sandboxed page can call `https://core.getfaceage.com`.

Webpack chunk loading inside `faceage.js` only treats `http(s)` URLs as a script base. The patch also accepts `chrome-extension:` so the chunks packaged next to `faceage.js` load.

The published widget creates a blank iframe and writes its UI into that frame. A Manifest V3 sandbox page has an opaque origin, and Chrome gives that child frame a second opaque origin, so the SDK cannot reach `contentDocument` and the panel stays blank. The patch swaps that iframe for a stand-in element whose `contentDocument` and `contentWindow` are the sandbox page itself. Inline chart and carousel scripts then run under the sandbox policy, and the page still has no `chrome.*` access.

The Face Age API rejects both that opaque origin and `chrome-extension://` origins (`It is not possible to access`). It does accept `http://localhost`, which is the development origin their widget already allows. A declarativeNetRequest rule rewrites the `Origin` header to `http://localhost` only for `https://core.getfaceage.com/*`. The photo is still uploaded to Face Age; the rewrite does not hide the request from you or from them. If a Client ID is limited to other sites, add `http://localhost` on the Face Age panel or the scanner will stop at that error.

## Limitations

- Product cards are found with heuristics (`product-card`, `product-tile`, schema.org Product, and similar). Custom storefronts can be missed or, more rarely, badged too broadly. The dictionary is intentionally specific so a word like “glowing” does not match “glow”.
- English terms are the main list. Persian (`fa`) terms are included so another language is a data change, not a code change. Add a language by putting a string array on `terms` in `src/lib/dictionary.ts`.
- The camera runs inside the sandboxed frame. Grant camera access when Chrome asks. If the sandbox cannot use the camera on a particular browser build, upload a photo instead. Both controls are enabled.
- A completed scan needs a working Client ID and a photo the Face Age service accepts. This repository cannot complete that call for you.
- Some decorative SVGs referenced by the published Face Age stylesheet are missing from the CDN (`/v2.2/images/...` returns 404). The scanner still runs.
- Firefox support is the same package, loaded as a temporary add-on. It is less heavily exercised than Chrome.

## Development

```bash
npm install
npm test
npm run lint
npm run build
```

`npm test` runs Vitest on profile building, keyword matching, domain parsing, and product-card badging.

`npm run check:widget` loads `dist/` in Chrome for Testing, saves a Client ID from `FACEAGE_CLIENT_ID` or `.env.local`, and checks that the widget mounts. Copy `.env.example` to `.env.local`. Do not commit a Client ID.

## Contributing

Issues and pull requests are welcome. Keep code, comments, docs, and commit messages in English.

- Matching behavior belongs in `src/lib` with a unit test.
- New store defaults go in `DEFAULT_ALLOWLIST` in `src/lib/domains.ts`.
- New dictionary languages are extra keys on `terms`. They are included automatically.
- Do not store images, raw analysis payloads, or analytics ids.

## License

[MIT](LICENSE).

Third-party pieces used at runtime:

| Piece                                              | Version | License    | How it is loaded                            |
| -------------------------------------------------- | ------- | ---------- | ------------------------------------------- |
| [face-age](https://www.npmjs.com/package/face-age) | 2.4.11  | MIT        | Packaged from npm, with the URL patch above |
| [chart.js](https://www.npmjs.com/package/chart.js) | 4.4.6   | MIT        | Packaged                                    |
| [swiper](https://www.npmjs.com/package/swiper)     | 11.2.10 | MIT        | Packaged                                    |
| MediaPipe Face Mesh                                | 0.3     | Apache-2.0 | jsDelivr, from the sandbox page only        |
