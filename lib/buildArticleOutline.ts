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

function inferLevelFromElement(el: Element, text: string): OutlineLevel | null {
  const tag = el.tagName.toLowerCase();
  if (tag === "h1") return 1;
  if (tag === "h2") return 2;
  if (tag === "h3") return 3;

  const style = window.getComputedStyle(el);
  const fontSize = Number.parseFloat(style.fontSize || "0");
  const fontWeight = Number.parseInt(style.fontWeight || "400", 10);
  const textLen = text.length;

  if (fontSize >= 24 || fontWeight >= 700) {
    return 1;
  }
  if (fontSize >= 20 || (fontWeight >= 650 && textLen <= 30)) {
    return 2;
  }
  if (fontSize >= 17 || (fontWeight >= 600 && textLen <= 40)) {
    return 3;
  }

  if (/^([一二三四五六七八九十]+[、.．]|\d+[、.．)]|第[一二三四五六七八九十\d]+[章节部分])/.test(text)) {
    return 2;
  }

  return null;
}

export function buildArticleOutline(container: HTMLElement): ArticleOutlineItem[] {
  const candidates = container.querySelectorAll(
    "h1, h2, h3, p, section, div, strong"
  );

  const outline: ArticleOutlineItem[] = [];
  const seenText = new Set<string>();

  candidates.forEach((el, index) => {
    if (outline.length >= MAX_OUTLINE_ITEMS) {
      return;
    }

    const text = normalizeText(el.textContent || "");
    if (!text || text.length < 3 || text.length > 120) {
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

  return outline;
}
