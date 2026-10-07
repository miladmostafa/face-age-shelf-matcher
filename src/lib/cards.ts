const CARD_SELECTOR = [
  "[itemtype*='Product' i]",
  "[data-product-id]",
  "[data-productid]",
  "[data-product-card]",
  "li.product",
  "article.product",
  ".product-card",
  ".product-tile",
  ".product-item",
  ".product-grid-item",
  "[class*='product-card' i]",
  "[class*='product-tile' i]",
  "[class*='productcard' i]",
  "[class*='producttile' i]",
  "[data-testid*='product-card' i]",
  "[data-testid*='product-tile' i]",
].join(",");

const SPECIFIC_TITLE_SELECTOR = [
  "[itemprop='name']",
  "[class*='product-name' i]",
  "[class*='product-title' i]",
  "[class*='productname' i]",
  "[data-testid*='product-name' i]",
  "[data-testid*='product-title' i]",
].join(",");

const HEADING_SELECTOR = "h1, h2, h3, h4";

const DESCRIPTION_SELECTOR = [
  "[itemprop='description']",
  "[class*='product-description' i]",
  "[class*='short-description' i]",
  "[class*='product-desc' i]",
].join(",");

function visibleText(element: Element | null, max: number): string {
  if (!element) return "";
  const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (text.length <= max) return text;
  return text.slice(0, max);
}

export function readCardCopy(card: HTMLElement): { title: string; description: string } {
  const specific = card.querySelector(SPECIFIC_TITLE_SELECTOR);
  const heading = card.querySelector(HEADING_SELECTOR);
  const title = visibleText(specific, 180) || visibleText(heading, 180);
  let description = visibleText(card.querySelector(DESCRIPTION_SELECTOR), 500);
  if (description === title) description = "";
  return { title, description };
}

function titleCount(card: HTMLElement): number {
  const nodes = new Set<Element>();
  card.querySelectorAll(`${SPECIFIC_TITLE_SELECTOR}, ${HEADING_SELECTOR}`).forEach((node) => {
    nodes.add(node);
  });
  return nodes.size;
}

/**
 * Innermost product-card candidates that look like a single product,
 * not the grid that wraps them.
 */
export function findProductCards(root: ParentNode): HTMLElement[] {
  const matches = Array.from(root.querySelectorAll(CARD_SELECTOR)).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  const matchSet = new Set<HTMLElement>(matches);
  return matches.filter((card) => {
    if (card.closest(".ssm-host")) return false;
    const nested = card.querySelector(CARD_SELECTOR);
    if (nested instanceof HTMLElement && nested !== card && matchSet.has(nested)) return false;
    if (titleCount(card) > 3) return false;
    const { title } = readCardCopy(card);
    return title.length >= 3;
  });
}
