import type { ArticleOutlineItem, OutlineLevel } from "../types";

const MAX_OUTLINE_ITEMS = 80;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function ensureAnchor(el: Element, text: string, index: number): string {
  const existing = el.getAttribute("data-wechat-anchor") || el.id;
  if (existing) {
    el.setAttribute("data-wechat-anchor", existing);
    if (!el.id) {
      el.id = existing;
    }
    return existing;
  }

  const base = slugify(text) || `section-${index + 1}`;
  const anchor = `wxa-${base}-${index + 1}`;
  el.setAttribute("data-wechat-anchor", anchor);
  el.id = anchor;
  return anchor;
}

function isNumericSectionMarker(text: string): boolean {
  return /^\d{1,3}$/.test(text.trim());
}


function inferLevelFromElement(el: Element, text: string): OutlineLevel | null {
  const tag = el.tagName.toLowerCase();
  if (tag === "h1") return 1;
  if (tag === "h2") return 2;
  if (tag === "h3") return 3;
  return null;
}

function mergeAdjacentSectionHeadings(outline: ArticleOutlineItem[]): ArticleOutlineItem[] {
  const merged: ArticleOutlineItem[] = [];

  for (let i = 0; i < outline.length; i += 1) {
    const current = outline[i];
    const next = outline[i + 1];

    if (
      current &&
      next &&
      isNumericSectionMarker(current.text) &&
      !isNumericSectionMarker(next.text)
    ) {
      merged.push({
        level: next.level,
        text: `${current.text} ${next.text}`,
        // Use the actual heading's anchor for better scroll positioning.
        anchor: next.anchor
      });
      i += 1;
      continue;
    }

    merged.push(current);
  }

  return merged;
}

export function buildArticleOutline(container: HTMLElement): ArticleOutlineItem[] {
  // Only extract from semantic heading tags to avoid noise
  const candidates = container.querySelectorAll("h1, h2, h3");

  const outline: ArticleOutlineItem[] = [];
  const seenText = new Set<string>();

  candidates.forEach((el, index) => {
    if (outline.length >= MAX_OUTLINE_ITEMS) {
      return;
    }

    const text = normalizeText(el.textContent || "");
    if (!text || text.length > 120) {
      return;
    }

    const level = inferLevelFromElement(el, text);
    if (!level) {
      return;
    }

    const dedupeKey = `${level}:${text}`;
    if (seenText.has(dedupeKey)) {
      return;
    }
    seenText.add(dedupeKey);

    const anchor = ensureAnchor(el, text, index);
    el.setAttribute("data-outline-level", String(level));

    outline.push({
      level,
      text,
      anchor
    });
  });

  return mergeAdjacentSectionHeadings(outline);
}
