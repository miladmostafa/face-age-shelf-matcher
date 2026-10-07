/** Skin concerns reported by face-age 2.4.11. */
export const PROBLEM_KEYS = [
  "fineWrinkles",
  "eyeWrinkles",
  "deepWrinkles",
  "darkCircle",
  "eyeBag",
  "pores",
  "pigment",
  "redness",
  "oiliness",
  "dryness",
  "sagginess",
  "dullness",
  "acne",
] as const;

export type ProblemKey = (typeof PROBLEM_KEYS)[number];

const PROBLEM_KEY_SET = new Set<string>(PROBLEM_KEYS);

/** Aliases seen in the SDK (camelCase, snake_case, and a few plurals). */
const ALIASES: Record<string, ProblemKey> = {
  finewrinkles: "fineWrinkles",
  fine_wrinkles: "fineWrinkles",
  wrinkles: "fineWrinkles",
  eyewrinkles: "eyeWrinkles",
  eye_wrinkles: "eyeWrinkles",
  deepwrinkles: "deepWrinkles",
  deep_wrinkles: "deepWrinkles",
  darkcircle: "darkCircle",
  dark_circle: "darkCircle",
  darkcircles: "darkCircle",
  eyebag: "eyeBag",
  eye_bag: "eyeBag",
  eyebags: "eyeBag",
  pores: "pores",
  pore: "pores",
  pigment: "pigment",
  pigments: "pigment",
  redness: "redness",
  oiliness: "oiliness",
  dryness: "dryness",
  sagginess: "sagginess",
  dullness: "dullness",
  acne: "acne",
  acnes: "acne",
};

export function isProblemKey(value: string): value is ProblemKey {
  return PROBLEM_KEY_SET.has(value);
}

export function normalizeProblemKey(raw: string): ProblemKey | null {
  const spaced = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!spaced) return null;
  if (ALIASES[spaced]) return ALIASES[spaced];
  const compact = spaced.replace(/_/g, "");
  return ALIASES[compact] ?? null;
}
