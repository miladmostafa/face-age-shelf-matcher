import { describe, expect, it } from "vitest";
import { applyProfile } from "../src/content/apply";
import { findProductCards } from "../src/lib/cards";
import type { ScanProfile } from "../src/lib/profile";

const PROFILE: ScanProfile = {
  version: 1,
  scannedAt: 1_700_000_000_000,
  problems: ["dryness", "darkCircle"],
  skinType: "dry",
};

function mountStore(): void {
  document.body.innerHTML = `
    <section class="product-card-list">
      <article class="product-card">
        <h3 class="product-title">Hydrating serum</h3>
        <p class="product-description">Moisture barrier care for dry skin.</p>
      </article>
      <article class="product-card">
        <h3 class="product-title">Under-eye cream</h3>
        <p class="product-description">Softens the look of dark circles.</p>
      </article>
      <article class="product-tile">
        <h3 class="product-name">Satin lipstick</h3>
        <p class="product-description">A rose shade.</p>
      </article>
    </section>
  `;
}

describe("product cards", () => {
  it("finds individual cards and skips the wrapping list", () => {
    mountStore();
    const cards = findProductCards(document);
    expect(cards).toHaveLength(3);
    expect(cards.some((card) => card.classList.contains("product-card-list"))).toBe(false);
  });

  it("badges matching cards and shows the keywords when opened", () => {
    mountStore();
    expect(applyProfile(document, PROFILE)).toBe(2);
    const badges = document.querySelectorAll(".ssm-host");
    expect(badges).toHaveLength(2);

    const button = badges[0]?.shadowRoot?.querySelector("button");
    const panel = badges[0]?.shadowRoot?.querySelector(".panel");
    expect(button?.textContent).toBe("Matches your scan");
    expect(panel?.textContent).toContain("hydrating");
    expect(panel instanceof HTMLElement && panel.hidden).toBe(true);

    button?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(panel instanceof HTMLElement && panel.hidden).toBe(false);
    expect(document.body.textContent).not.toContain("Satin lipstick badge");
    expect(document.querySelector(".product-tile .ssm-host")).toBeNull();
  });

  it("clears badges when the profile is removed", () => {
    mountStore();
    applyProfile(document, PROFILE);
    expect(applyProfile(document, null)).toBe(0);
    expect(document.querySelector(".ssm-host")).toBeNull();
  });

  it("keeps a product card when a nested image link also matches", () => {
    document.body.innerHTML = `
      <product-card-wrapper class="product-card">
        <a class="product-item" href="/p/serum"><img alt="" /></a>
        <a class="product-item-title" href="/p/serum">Salicylic Acid 2% Solution</a>
      </product-card-wrapper>
      <article class="pi" itemscope itemtype="http://schema.org/Product">
        <meta itemprop="name" content="Milky Jelly Cleanser" />
        <div class="ir ir--product-card"></div>
        <h3 class="pi__title">Hydrating cleanser</h3>
      </article>
    `;
    const cards = findProductCards(document);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.classList.contains("product-card")).toBe(true);
    expect(cards[1]?.tagName).toBe("ARTICLE");
    const acne: ScanProfile = { ...PROFILE, problems: ["acne", "dryness"] };
    expect(applyProfile(document, acne)).toBe(2);
  });

  it("reads a concern subtitle and shopify or grid titles", () => {
    document.body.innerHTML = `
      <div class="product-tile">
        <h2 class="pdp-link">Sulfur Powder</h2>
        <h3 class="title-descriptor">Treats Acne, Soothes Redness</h3>
      </div>
      <div class="card-wrapper">
        <div class="js-pills" data-product-id="1">In your recipe</div>
        <h3 class="card__title"><a href="/products/redness">Azelaic Acid Serum</a></h3>
        <p class="card__heading">Clinically proven to minimise redness.</p>
      </div>
      <a class="list__itemContainer" href="/cream">
        <div class="list__itemTitle">Relief Cream</div>
      </a>
    `;
    const cards = findProductCards(document);
    expect(cards.map((card) => readTitle(card))).toEqual([
      "Sulfur Powder",
      "Azelaic Acid Serum",
      "Relief Cream",
    ]);
    const acne: ScanProfile = { ...PROFILE, problems: ["acne", "redness"] };
    expect(applyProfile(document, acne)).toBe(2);
  });
});

function readTitle(card: HTMLElement): string {
  const title = card.querySelector(
    ".product-item-title, .pdp-link, .card__title, [class*='itemTitle']",
  );
  return title?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}
