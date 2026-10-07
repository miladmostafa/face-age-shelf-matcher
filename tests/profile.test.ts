import { describe, expect, it } from "vitest";
import {
  buildProfile,
  COUNT_SCORE_THRESHOLD,
  extractSkinType,
  PERCENT_SCORE_THRESHOLD,
  sanitizeProfile,
} from "../src/lib/profile";

const NOW = 1_700_000_000_000;

describe("buildProfile", () => {
  it("keeps concerns at or above the percent threshold and drops the rest", () => {
    const profile = buildProfile(
      {
        analysis: [
          { key: "dryness", number: PERCENT_SCORE_THRESHOLD },
          { key: "darkCircle", number: PERCENT_SCORE_THRESHOLD - 1 },
          { key: "pores", number: "55" },
          { key: "damagePercentage", number: 90 },
        ],
      },
      NOW,
    );
    expect(profile).toEqual({
      version: 1,
      scannedAt: NOW,
      problems: ["pores", "dryness"],
      skinType: null,
    });
  });

  it("treats fractional scores below 1 as ratios", () => {
    const profile = buildProfile(
      {
        analysis: [
          { key: "redness", number: 0.3 },
          { key: "oiliness", number: 0.29 },
        ],
      },
      NOW,
    );
    expect(profile?.problems).toEqual(["redness"]);
  });

  it("uses a count threshold for acne and does not scale counts", () => {
    const kept = buildProfile(
      { analysis: [{ key: "acne", number: COUNT_SCORE_THRESHOLD, format: "Count" }] },
      NOW,
    );
    const missed = buildProfile({ analysis: [{ key: "acne", number: 0.5, format: "Count" }] }, NOW);
    expect(kept?.problems).toEqual(["acne"]);
    expect(missed?.problems).toEqual([]);
  });

  it("accepts snake_case keys and a nested problems list", () => {
    const profile = buildProfile(
      {
        analysis: { problems: [{ key: "dark_circle", score: 80 }] },
        activeSelections: { skin_type1: "dry" },
      },
      NOW,
    );
    expect(profile?.problems).toEqual(["darkCircle"]);
    expect(profile?.skinType).toBe("dry");
  });

  it("returns null when the analysis payload is missing", () => {
    expect(buildProfile({}, NOW)).toBeNull();
  });

  it("reads skin type from quiz-shaped answers and ignores images", () => {
    expect(extractSkinType([{ name: "skin_type", answer: "Combination" }])).toBe("Combination");
    expect(extractSkinType({ email: "a@b.co", photo: "data:image/jpeg;base64,abc" })).toBeNull();
    const profile = buildProfile(
      {
        analysis: [],
        activeSelections: { skinType: "data:image/png;base64,aaaa" },
      },
      NOW,
    );
    expect(profile?.skinType).toBeNull();
  });
});

describe("sanitizeProfile", () => {
  it("rebuilds a profile and drops extra fields such as images", () => {
    const clean = sanitizeProfile(
      {
        version: 1,
        scannedAt: NOW,
        problems: ["acne", "dryness"],
        skinType: "oily",
        image: "data:image/jpeg;base64,secret",
        analysis: { photo: "nope" },
      },
      NOW,
    );
    expect(clean).toEqual({
      version: 1,
      scannedAt: NOW,
      problems: ["dryness", "acne"],
      skinType: "oily",
    });
    expect(JSON.stringify(clean)).not.toContain("image");
    expect(JSON.stringify(clean)).not.toContain("secret");
  });

  it("rejects unknown concern keys and oversized skin types", () => {
    expect(sanitizeProfile({ version: 1, problems: ["not-a-concern"], scannedAt: NOW })).toBeNull();
    expect(
      sanitizeProfile({ version: 1, problems: ["acne"], skinType: "x".repeat(80), scannedAt: NOW }),
    ).toBeNull();
  });
});
