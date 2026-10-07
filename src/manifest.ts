import { defineManifest } from "@crxjs/vite-plugin";
import { DEFAULT_ALLOWLIST, domainToMatches } from "./lib/domains";

const defaultMatches = DEFAULT_ALLOWLIST.flatMap((domain) => domainToMatches(domain));

export default defineManifest({
  manifest_version: 3,
  name: "Skincare Shelf Matcher",
  version: "0.1.0",
  description: "Badges skincare products that mention concerns found by your Face Age scan.",
  minimum_chrome_version: "120",
  permissions: ["storage", "scripting", "declarativeNetRequest"],
  host_permissions: [...defaultMatches, "https://core.getfaceage.com/*"],
  declarative_net_request: {
    rule_resources: [
      {
        id: "faceage_origin",
        enabled: true,
        path: "faceage-origin-rules.json",
      },
    ],
  },
  optional_host_permissions: ["http://*/*", "https://*/*"],
  action: {
    default_title: "Skincare Shelf Matcher",
    default_popup: "src/popup/popup.html",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
    },
  },
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  options_ui: {
    page: "src/options/options.html",
    open_in_tab: true,
  },
  content_scripts: [
    {
      matches: [...defaultMatches],
      js: ["src/content/content.ts"],
      run_at: "document_idle",
    },
  ],
  sandbox: {
    pages: ["src/scan/sandbox.html"],
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
    sandbox:
      "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; object-src 'self'; worker-src 'self' blob: https://cdn.jsdelivr.net",
  },
  browser_specific_settings: {
    gecko: {
      id: "skincare-shelf-matcher@getfaceage.com",
      strict_min_version: "128.0",
    },
  },
});
