import { crx } from "@crxjs/vite-plugin";
import { defineConfig, type Plugin } from "vite";
import manifest from "./src/manifest";

/** Vite adds crossorigin to module scripts. Extension fetches then fail CORS. */
function stripCrossOrigin(): Plugin {
  return {
    name: "strip-crossorigin",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(="[^"]*")?/g, "");
    },
  };
}

export default defineConfig({
  plugins: [crx({ manifest }), stripCrossOrigin()],
  build: {
    rollupOptions: {
      input: {
        scan: "src/scan/scan.html",
      },
    },
  },
});
