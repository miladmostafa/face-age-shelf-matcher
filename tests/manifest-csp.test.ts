import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("extension page CSP", () => {
  it("allows WebAssembly on extension pages in the manifest source", () => {
    const source = readFileSync(path.join(root, "src/manifest.ts"), "utf8");
    expect(source).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(source).toContain("object-src 'self'");
    expect(source).toContain("extension_pages");
  });
});
