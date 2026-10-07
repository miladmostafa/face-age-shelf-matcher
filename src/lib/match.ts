import { DICTIONARY } from "./dictionary";
import { normalizeProblemKey, PROBLEM_KEYS, type ProblemKey } from "./problems";

export type MatchHit = {
  problem: ProblemKey;
  label: string;
  keywords: string[];
};

const regexCache = new Map<string, RegExp>();

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc']/g, "")
    .replace(/\u200c/g, "")
    .replace(/[-_/+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function regexFor(term: string): RegExp | null {
  const needle = normalizeForMatch(term);
  if (!needle) return null;
  const cached = regexCache.get(needle);
  if (cached) return cached;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`, "u");
  regexCache.set(needle, pattern);
  return pattern;
}

export function termMatches(text: string, term: string): boolean {
  const pattern = regexFor(term);
  if (!pattern) return false;
  return pattern.test(normalizeForMatch(text));
}

function languagesFor(problem: ProblemKey, requested?: readonly string[]): string[] {
  const available = Object.keys(DICTIONARY[problem].terms);
  if (!requested) return available;
  return available.filter((language) => requested.includes(language));
}

/**
 * Keyword match of product title/description against the concerns in a scan.
 * Languages default to every list in the dictionary, so adding `fa`, `de`, …
 * starts participating without a second switch.
 */
export function matchProductText(
  text: string,
  problems: readonly string[],
  languages?: readonly string[],
): MatchHit[] {
  const selected = new Set<ProblemKey>();
  for (const problem of problems) {
    const key = normalizeProblemKey(problem);
    if (key) selected.add(key);
  }

  const hits: MatchHit[] = [];
  for (const key of PROBLEM_KEYS) {
    if (!selected.has(key)) continue;
    const entry = DICTIONARY[key];
    const keywords: string[] = [];
    for (const language of languagesFor(key, languages)) {
      for (const term of entry.terms[language] ?? []) {
        if (termMatches(text, term) && !keywords.includes(term)) keywords.push(term);
      }
    }
    if (keywords.length > 0) {
      hits.push({ problem: key, label: entry.label, keywords });
    }
  }
  return hits;
}
