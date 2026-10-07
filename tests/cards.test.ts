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
});
