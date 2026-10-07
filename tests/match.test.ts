import { describe, expect, it } from "vitest";
import { DICTIONARY } from "../src/lib/dictionary";
import { matchProductText, termMatches } from "../src/lib/match";

describe("matchProductText", () => {
  it("matches example shelf phrases and keeps word boundaries", () => {
    const hits = matchProductText("Hydrating under-eye cream for dark circles", [
      "darkCircle",
      "dryness",
      "acne",
    ]);
    const byProblem = Object.fromEntries(hits.map((hit) => [hit.problem, hit.keywords]));
    expect(byProblem.darkCircle).toEqual(expect.arrayContaining(["dark circles", "under-eye"]));
    expect(byProblem.dryness).toEqual(expect.arrayContaining(["hydrating"]));
    expect(byProblem.acne).toBeUndefined();
  });

  it("does not match fragments inside longer words", () => {
    expect(termMatches("notpores extra hydra", "pores")).toBe(false);
    expect(termMatches("notpores extra hydra", "hydrating")).toBe(false);
    expect(termMatches("a hydrating gel", "hydrating")).toBe(true);
    expect(termMatches("glowing review", "glow")).toBe(false);
  });

  it("treats hyphens and apostrophes as spacing", () => {
    expect(termMatches("Oil-control mattifier", "oil control")).toBe(true);
    expect(termMatches("targets crow’s feet", "crow's feet")).toBe(true);
  });

  it("matches Persian terms and can limit the language", () => {
    const persian = matchProductText("سرم آبرسان برای پوست خشک", ["dryness"], ["fa"]);
    expect(persian[0]?.keywords).toEqual(expect.arrayContaining(["آبرسان", "پوست خشک"]));
    expect(matchProductText("سرم آبرسان", ["dryness"], ["en"])).toEqual([]);
  });

  it("uses every language on the dictionary unless one is requested", () => {
    expect(DICTIONARY.acne.terms.en.length).toBeGreaterThan(0);
    expect(DICTIONARY.acne.terms.fa?.length).toBeGreaterThan(0);
    const hits = matchProductText("درمان آکنه", ["acne"]);
    expect(hits.map((hit) => hit.problem)).toEqual(["acne"]);
  });

  it("ignores concerns that are not on the profile", () => {
    expect(matchProductText("salicylic acid acne wash", ["dryness"])).toEqual([]);
  });
});
