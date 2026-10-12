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
  ".card-wrapper",
  "[class*='product-card' i]",
  "[class*='product-tile' i]",
  "[class*='productcard' i]",
  "[class*='producttile' i]",
  "[class*='__itemContainer']",
  "[data-testid*='product-card' i]",
  "[data-testid*='product-tile' i]",
].join(",");

const SPECIFIC_TITLE_SELECTOR = [
  "[class*='product-item-title' i]",
  "[class*='product-name' i]",
  "[class*='product-title' i]",
  "[class*='productname' i]",
  "[class*='card__title' i]",
  "[class*='__itemTitle']",
  "[itemprop='name']",
  "[data-testid*='product-name' i]",
  "[data-testid*='product-title' i]",
].join(",");

const HEADING_SELECTOR = "h1, h2, h3, h4";

const DESCRIPTION_SELECTOR = [
  "[itemprop='description']",
  "[class*='product-description' i]",
  "[class*='short-description' i]",
  "[class*='product-desc' i]",
  "[class*='card__heading' i]",
].join(",");

function visibleText(element: Element | null, max: number): string {
  if (!element) return "";
  const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (text.length <= max) return text;
  return text.slice(0, max);
}

function texts(card: HTMLElement, selector: string, max: number): string[] {
  const found: string[] = [];
  card.querySelectorAll(selector).forEach((node) => {
    const text = visibleText(node, max);
    if (text.length >= 3 && !found.includes(text)) found.push(text);
  });
  return found;
}

export function readCardCopy(card: HTMLElement): { title: string; description: string } {
  const specific = texts(card, SPECIFIC_TITLE_SELECTOR, 180);
  const headings = texts(card, HEADING_SELECTOR, 180);
  const title = specific[0] || headings[0] || "";
  let description = "";
  for (const text of texts(card, DESCRIPTION_SELECTOR, 500)) {
    if (text !== title) {
      description = text;
      break;
    }
  }
  if (!description) {
    const subtitle = [...specific.slice(1), ...headings].find((text) => text !== title);
    if (subtitle) description = subtitle;
  }
  return { title, description };
}

function titleCount(card: HTMLElement): number {
  const nodes = new Set<Element>();
  card.querySelectorAll(`${SPECIFIC_TITLE_SELECTOR}, ${HEADING_SELECTOR}`).forEach((node) => {
    if (visibleText(node, 180).length >= 3) nodes.add(node);
  });
  return nodes.size;
}

/**
 * Product cards that name a single product.
 * Image links and skeleton tiles often match the card selector and sit inside
 * the real card. Those fragments have no title, so they do not hide the card.
 * A grid is skipped when it contains another titled card.
 */
export function findProductCards(root: ParentNode): HTMLElement[] {
  const matches = Array.from(root.querySelectorAll(CARD_SELECTOR)).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  const titles = new Map<HTMLElement, string>();
  for (const card of matches) titles.set(card, readCardCopy(card).title);

  return matches.filter((card) => {
    if (card.closest(".ssm-host")) return false;
    const title = titles.get(card) ?? "";
    if (title.length < 3) return false;
    if (titleCount(card) > 3) return false;
    return !matches.some(
      (other) => other !== card && card.contains(other) && (titles.get(other)?.length ?? 0) >= 3,
    );
  });
}
