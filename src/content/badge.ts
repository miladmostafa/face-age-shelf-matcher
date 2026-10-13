import type { MatchHit } from "../lib/match";

const STYLE = `
  :host { all: initial; }
  .wrap { position: relative; display: inline-block; font-family: "Avenir Next", "Segoe UI", sans-serif; }
  button {
    appearance: none;
    border: 1px solid #8d3b31;
    background: #fffaf4;
    color: #6e2c24;
    font: 600 12px/1.2 "Avenir Next", "Segoe UI", sans-serif;
    letter-spacing: 0.01em;
    padding: 6px 8px;
    border-radius: 999px;
    box-shadow: 0 1px 0 rgba(36, 24, 16, 0.18);
    cursor: pointer;
  }
  button:focus-visible { outline: 2px solid #8d3b31; outline-offset: 2px; }
  .panel {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    width: 230px;
    background: #fffaf4;
    color: #221c17;
    border: 1px solid #e3d5c4;
    border-radius: 12px;
    padding: 10px 12px;
    box-shadow: 0 12px 28px rgba(36, 24, 16, 0.16);
    z-index: 1;
  }
  .panel[hidden] { display: none; }
  .panel h2 { margin: 0 0 6px; font-size: 13px; }
  ul { margin: 0; padding: 0; list-style: none; }
  li { margin: 0 0 6px; font-size: 12px; line-height: 1.35; }
  li strong { display: block; }
  .keywords { color: #6b5e53; }
  .note { margin: 8px 0 0; font-size: 11px; color: #6b5e53; }
`;

function closePanel(host: HTMLElement): void {
  const panel = host.shadowRoot?.querySelector(".panel");
  const button = host.shadowRoot?.querySelector("button");
  if (panel instanceof HTMLElement) panel.hidden = true;
  if (button instanceof HTMLButtonElement) button.setAttribute("aria-expanded", "false");
}

const openHosts = new Set<HTMLElement>();
let documentListener = false;

function ensureDocumentListener(): void {
  if (documentListener) return;
  documentListener = true;
  document.addEventListener(
    "click",
    (event) => {
      const path = event.composedPath();
      for (const host of openHosts) {
        if (!path.includes(host)) closePanel(host);
      }
    },
    true,
  );
}

export function mountBadge(card: HTMLElement, hits: MatchHit[], signature: string): void {
  if (getComputedStyle(card).position === "static") card.style.position = "relative";

  const host = document.createElement("div");
  host.className = "ssm-host";
  host.dataset.ssmSig = signature;
  host.style.position = "absolute";
  host.style.top = "8px";
  host.style.right = "8px";
  host.style.zIndex = "2147483646";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  const wrap = document.createElement("div");
  wrap.className = "wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Matches your scan";
  button.setAttribute("aria-expanded", "false");

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.hidden = true;
  const heading = document.createElement("h2");
  heading.textContent = "Matches your scan";
  const list = document.createElement("ul");
  for (const hit of hits) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = hit.label;
    const keywords = document.createElement("span");
    keywords.className = "keywords";
    keywords.textContent = hit.keywords.join(" · ");
    item.append(name, keywords);
    list.append(item);
  }
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = "Keyword match only. Not medical advice or a product endorsement.";
  panel.append(heading, list, note);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const open = panel.hidden;
    for (const other of openHosts) {
      if (other !== host) closePanel(other);
    }
    panel.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  button.addEventListener("pointerdown", stop);
  panel.addEventListener("click", stop);
  panel.addEventListener("pointerdown", stop);

  wrap.append(button, panel);
  shadow.append(style, wrap);
  card.append(host);
  openHosts.add(host);
  ensureDocumentListener();
}

export function badgeSignature(hits: MatchHit[]): string {
  return hits.map((hit) => `${hit.problem}:${hit.keywords.join(",")}`).join("|");
}
