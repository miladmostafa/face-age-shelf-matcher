import { describe, expect, it } from "vitest";
import {
  customDomains,
  DEFAULT_ALLOWLIST,
  domainToMatches,
  hostMatchesAllowlist,
  normalizeClientId,
  normalizeDomain,
  parseAllowlistText,
} from "../src/lib/domains";

describe("domains", () => {
  it("normalizes store URLs and rejects junk", () => {
    expect(normalizeDomain("https://www.Sephora.com/shop")).toBe("sephora.com");
    expect(normalizeDomain("*.ulta.com")).toBe("ulta.com");
    expect(normalizeDomain("localhost:8080")).toBe("localhost");
    expect(normalizeDomain("javascript:alert(1)")).toBeNull();
    expect(normalizeDomain("not a domain")).toBeNull();
  });

  it("parses a textarea, skips comments, and drops duplicates", () => {
    const parsed = parseAllowlistText("# stores\nhttps://www.ulta.com\nulta.com\nbad domain\n");
    expect(parsed.domains).toEqual(["ulta.com"]);
    expect(parsed.invalid).toEqual(["bad domain"]);
  });

  it("matches hosts without matching lookalikes", () => {
    expect(hostMatchesAllowlist("www.sephora.com", ["sephora.com"])).toBe(true);
    expect(hostMatchesAllowlist("sephora.com.evil.com", ["sephora.com"])).toBe(false);
    expect(hostMatchesAllowlist("notulta.com", ["ulta.com"])).toBe(false);
  });

  it("builds match patterns and separates custom sites from the defaults", () => {
    expect(domainToMatches("sephora.com")).toEqual(["*://sephora.com/*", "*://*.sephora.com/*"]);
    expect(domainToMatches("localhost")).toEqual(["http://localhost/*", "https://localhost/*"]);
    expect(customDomains([...DEFAULT_ALLOWLIST, "localhost"])).toEqual(["localhost"]);
  });

  it("accepts an empty client id and rejects whitespace", () => {
    expect(normalizeClientId("  ")).toEqual({ ok: true, id: "" });
    expect(normalizeClientId("abc def")).toEqual({
      ok: false,
      message: "Enter the Client ID from your Face Age panel.",
    });
    expect(normalizeClientId("0pHjExample")).toEqual({ ok: true, id: "0pHjExample" });
  });
});
