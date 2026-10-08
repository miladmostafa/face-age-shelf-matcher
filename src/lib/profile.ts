import { normalizeProblemKey, PROBLEM_KEYS, type ProblemKey } from "./problems";

/** Percent-style concern scores at or above this value are kept. */
export const PERCENT_SCORE_THRESHOLD = 30;

/** Acne is reported as a count. One or more lesions is enough to keep it. */
export const COUNT_SCORE_THRESHOLD = 1;

export type ScanProfile = {
  version: 1;
  scannedAt: number;
  problems: ProblemKey[];
  skinType: string | null;
};

export type RawProblem = {
  key?: unknown;
  number?: unknown;
  score?: unknown;
  value?: unknown;
  format?: unknown;
};

const SKIN_TYPE_MAX = 40;

export function coerceScore(raw: unknown, format: unknown, key: ProblemKey | null): number | null {
  const numeric =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const formatName = typeof format === "string" ? format.toLowerCase() : "";
  const isCount = key === "acne" || formatName === "count";
  if (isCount) return numeric;
  if (numeric > 0 && numeric < 1) return numeric * 100;
  return numeric;
}

export function scorePasses(key: ProblemKey, raw: unknown, format?: unknown): boolean {
  const score = coerceScore(raw, format, key);
  if (score == null) return false;
  const formatName = typeof format === "string" ? format.toLowerCase() : "";
  if (key === "acne" || formatName === "count") return score >= COUNT_SCORE_THRESHOLD;
  return score >= PERCENT_SCORE_THRESHOLD;
}

function cleanSkinType(value: unknown): string | null {
  if (typeof value !== "string") {
    if (Array.isArray(value) && value.length === 1) return cleanSkinType(value[0]);
    return null;
  }
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > SKIN_TYPE_MAX) return null;
  if (/^data:|^blob:|https?:/i.test(clean)) return null;
  if (/[\u0000-\u001f]/.test(clean)) return null;
  return clean;
}

export function extractSkinType(selections: unknown): string | null {
  if (!selections || typeof selections !== "object") return null;
  if (Array.isArray(selections)) {
    for (const item of selections) {
      const found = extractSkinType(item);
      if (found) return found;
    }
    return null;
  }

  const record = selections as Record<string, unknown>;
  const question = typeof record.question === "string" ? record.question : "";
  const name = typeof record.name === "string" ? record.name : "";
  const named = record.answer ?? record.value;
  const nameCompact = name.toLowerCase().replace(/[\s_-]/g, "");
  if ((/skin\s*type/i.test(question) || nameCompact.includes("skintype")) && named != null) {
    const fromPair = cleanSkinType(named);
    if (fromPair) return fromPair;
  }

  for (const [key, value] of Object.entries(record)) {
    const compact = key.toLowerCase().replace(/[\s_-]/g, "");
    if (!compact.includes("skintype")) continue;
    const found = cleanSkinType(value);
    if (found) return found;
  }
  return null;
}

function readProblemList(analysis: unknown): RawProblem[] | null {
  if (Array.isArray(analysis)) return analysis as RawProblem[];
  if (!analysis || typeof analysis !== "object") return null;
  const problems = (analysis as { problems?: unknown }).problems;
  if (Array.isArray(problems)) return problems as RawProblem[];
  return null;
}

function rawScore(problem: RawProblem): unknown {
  if (problem.number != null) return problem.number;
  if (problem.score != null) return problem.score;
  return problem.value;
}

/**
 * Build the only object this extension persists after a scan.
 * Images, raw payloads, and below-threshold scores are dropped.
 * Returns null when the analysis payload itself is missing.
 */
export function buildProfile(
  input: { analysis?: unknown; activeSelections?: unknown },
  now = Date.now(),
): ScanProfile | null {
  const problems = readProblemList(input.analysis);
  if (!problems) return null;

  const selected = new Set<ProblemKey>();
  for (const problem of problems) {
    if (!problem || typeof problem !== "object") continue;
    const key = typeof problem.key === "string" ? normalizeProblemKey(problem.key) : null;
    if (!key) continue;
    if (scorePasses(key, rawScore(problem), problem.format)) selected.add(key);
  }

  return {
    version: 1,
    scannedAt: now,
    problems: PROBLEM_KEYS.filter((key) => selected.has(key)),
    skinType: extractSkinType(input.activeSelections),
  };
}

/** Rebuild a profile from storage, dropping anything that is not a concern key. */
export function sanitizeProfile(value: unknown, now = Date.now()): ScanProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.problems)) return null;

  const selected = new Set<ProblemKey>();
  for (const item of record.problems) {
    if (typeof item !== "string") return null;
    const key = normalizeProblemKey(item);
    if (!key) return null;
    selected.add(key);
  }

  let skinType: string | null = null;
  if (record.skinType != null) {
    skinType = cleanSkinType(record.skinType);
    if (!skinType) return null;
  }

  const scannedAt =
    typeof record.scannedAt === "number" && Number.isFinite(record.scannedAt)
      ? record.scannedAt
      : now;

  return {
    version: 1,
    scannedAt,
    problems: PROBLEM_KEYS.filter((key) => selected.has(key)),
    skinType,
  };
}
