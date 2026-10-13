import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PANEL_URL,
  SETUP_MESSAGE,
  needsClientId,
  shouldOpenOptionsOnInstall,
} from "../src/lib/onboarding";

describe("client id onboarding", () => {
  it("points people at the Face Age panel", () => {
    expect(PANEL_URL).toBe("https://panel.getfaceage.com/");
    expect(SETUP_MESSAGE).toMatch(/extension settings/i);
  });

  it("treats a blank id as missing", () => {
    expect(needsClientId("")).toBe(true);
    expect(needsClientId("   ")).toBe(true);
    expect(needsClientId("abc123")).toBe(false);
  });

  it("opens settings only on a fresh install without an id", () => {
    expect(shouldOpenOptionsOnInstall("install", "")).toBe(true);
    expect(shouldOpenOptionsOnInstall("install", "   ")).toBe(true);
    expect(shouldOpenOptionsOnInstall("install", "abc123")).toBe(false);
    expect(shouldOpenOptionsOnInstall("update", "")).toBe(false);
    expect(shouldOpenOptionsOnInstall("chrome_update", "")).toBe(false);
  });

  it("shows the settings button and panel link before a scan can start", () => {
    const popup = readFileSync(path.join(process.cwd(), "src/popup/popup.html"), "utf8");
    const scan = readFileSync(path.join(process.cwd(), "src/scan/scan.html"), "utf8");
    const options = readFileSync(path.join(process.cwd(), "src/options/options.html"), "utf8");
    for (const html of [popup, scan, options]) {
      expect(html).toContain(PANEL_URL);
      expect(html).toContain('target="_blank"');
    }
    expect(popup).toContain('id="open-settings"');
    expect(popup).toContain('id="setup"');
    expect(scan).toContain('id="open-options"');
    expect(scan).toContain('id="missing"');
    expect(options).toContain("Get a Client ID");
  });
});
