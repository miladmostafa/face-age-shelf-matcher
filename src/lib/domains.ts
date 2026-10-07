export const DEFAULT_ALLOWLIST = [
  "sephora.com",
  "ulta.com",
  "dermstore.com",
  "paulaschoice.com",
  "theordinary.com",
  "cultbeauty.com",
  "cultbeauty.co.uk",
  "lookfantastic.com",
  "lookfantastic.co.uk",
  "spacenk.com",
  "glossier.com",
  "beautybay.com",
  "yesstyle.com",
  "iherb.com",
  "theinkeylist.com",
] as const;

const MAX_DOMAINS = 50;
const IP_ADDRESS = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value || value.startsWith("#")) return null;
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.split(/[/?#]/)[0] ?? "";
  value = value.replace(/:\d+$/, "");
  value = value.replace(/^\*\./, "");
  if (value.startsWith("www.") && value !== "www") value = value.slice(4);
  if (!value || value.length > 253) return null;
  if (value === "localhost" || IP_ADDRESS.test(value)) return value;
  if (!/^[a-z0-9.-]+$/.test(value)) return null;
  if (
    !value.includes(".") ||
    value.startsWith(".") ||
    value.endsWith(".") ||
    value.includes("..")
  ) {
    return null;
  }
  return value;
}

export function parseAllowlistText(text: string): { domains: string[]; invalid: string[] } {
  const domains: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const domain = normalizeDomain(trimmed);
    if (!domain) {
      invalid.push(trimmed);
      continue;
    }
    if (seen.has(domain)) continue;
    seen.add(domain);
    domains.push(domain);
  }
  return { domains: domains.slice(0, MAX_DOMAINS), invalid };
}

export function formatAllowlist(domains: readonly string[]): string {
  return domains.join("\n");
}

export function domainToMatches(domain: string): string[] {
  if (domain === "localhost" || IP_ADDRESS.test(domain)) {
    return [`http://${domain}/*`, `https://${domain}/*`];
  }
  return [`*://${domain}/*`, `*://*.${domain}/*`];
}

export function hostMatchesAllowlist(hostname: string, allowlist: readonly string[]): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  return allowlist.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function customDomains(allowlist: readonly string[]): string[] {
  const defaults = new Set<string>(DEFAULT_ALLOWLIST);
  return allowlist.filter((domain) => !defaults.has(domain));
}

export function normalizeClientId(
  value: string,
): { ok: true; id: string } | { ok: false; message: string } {
  const id = value.trim();
  if (!id) return { ok: true, id: "" };
  if (/\s/.test(id) || id.length < 6 || id.length > 128) {
    return { ok: false, message: "Enter the Client ID from your Face Age panel." };
  }
  return { ok: true, id };
}
