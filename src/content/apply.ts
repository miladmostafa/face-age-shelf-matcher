import { badgeSignature, mountBadge } from "./badge";
import { findProductCards, readCardCopy } from "../lib/cards";
import { matchProductText } from "../lib/match";
import type { ScanProfile } from "../lib/profile";

export function clearBadges(root: ParentNode): void {
  root.querySelectorAll(".ssm-host").forEach((node) => node.remove());
  root.querySelectorAll("[data-ssm-card]").forEach((node) => {
    node.removeAttribute("data-ssm-card");
  });
}

/** Badge product cards whose title or description matches the saved scan. */
export function applyProfile(root: ParentNode, profile: ScanProfile | null): number {
  const cards = profile && profile.problems.length > 0 ? findProductCards(root) : [];
  const cardSet = new Set(cards);

  root.querySelectorAll("[data-ssm-card]").forEach((node) => {
    if (!(node instanceof HTMLElement) || cardSet.has(node)) return;
    node.querySelector(":scope > .ssm-host")?.remove();
    node.removeAttribute("data-ssm-card");
  });

  if (!profile || profile.problems.length === 0) {
    clearBadges(root);
    return 0;
  }

  let count = 0;
  for (const card of cards) {
    const copy = readCardCopy(card);
    const hits = matchProductText(`${copy.title}\n${copy.description}`, profile.problems);
    const existing = card.querySelector(":scope > .ssm-host");
    if (hits.length === 0) {
      existing?.remove();
      card.removeAttribute("data-ssm-card");
      continue;
    }
    const signature = badgeSignature(hits);
    if (existing instanceof HTMLElement && existing.dataset.ssmSig === signature) {
      count += 1;
      continue;
    }
    existing?.remove();
    mountBadge(card, hits, signature);
    card.setAttribute("data-ssm-card", "1");
    count += 1;
  }
  return count;
}
