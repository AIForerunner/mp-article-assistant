import { JSDOM } from "jsdom";

const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF\u00AD]/g;
const COMMON_PUNCTUATION =
  /[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~，。！？、；：“”‘’（）【】《》〈〉·…—～￥]/g;

export function normalizeComparableText(input?: string): string {
  return (input || "")
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS, "")
    .replace(COMMON_PUNCTUATION, "")
    .toLowerCase()
    .trim();
}

export function normalizeCoverageText(input?: string): string {
  return (input || "")
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, "")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

export function roughlyMatches(actual?: string, expected?: string, minSimilarity = 0.82): boolean {
  const normalizedActual = normalizeComparableText(actual);
  const normalizedExpected = normalizeComparableText(expected);

  if (!normalizedExpected) {
    return Boolean(normalizedActual);
  }
  if (!normalizedActual) {
    return false;
  }
  if (
    normalizedActual === normalizedExpected ||
    normalizedActual.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedActual)
  ) {
    return true;
  }

  const maxLength = Math.max(normalizedActual.length, normalizedExpected.length);
  const distance = levenshteinDistance(normalizedActual, normalizedExpected);
  return 1 - distance / maxLength >= minSimilarity;
}

export function isPlaceholderUrl(url?: string): boolean {
  const value = (url || "").trim().toLowerCase();
  return (
    !value ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value === "about:blank" ||
    value === "javascript:void(0)"
  );
}

export function sanitizePublicUrl(rawUrl: string, index: number, kind: "image" | "link"): string {
  const fallback =
    kind === "image"
      ? `https://example.invalid/images/fixture-${String(index).padStart(3, "0")}.png`
      : `https://example.invalid/links/fixture-${String(index).padStart(3, "0")}`;

  try {
    const url = new URL(rawUrl, "https://example.invalid");
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
      return fallback;
    }
    if (url.protocol === "mailto:") {
      return `mailto:fixture-${index}@example.invalid`;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function replacementTextFor(el: Element | null, index: number): string {
  const tag = el?.tagName.toLowerCase();
  if (tag && /^h[1-6]$/.test(tag)) {
    return `测试章节 ${index}`;
  }
  if (tag === "a") {
    return `测试链接 ${index}`;
  }
  if (tag === "code" || tag === "pre") {
    return "const fixtureValue = 42;";
  }
  return `测试段落 ${index}，用于验证公开 fixture 的结构化抽取。`;
}

function anonymizeTextNodes(root: Element): void {
  const walker = root.ownerDocument.createTreeWalker(root, root.ownerDocument.defaultView!.NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.textContent?.trim()) {
      textNodes.push(node);
    }
  }

  textNodes.forEach((node, index) => {
    node.textContent = replacementTextFor(node.parentElement, index + 1);
  });
}

function scrubAttributes(root: Element): void {
  let imageIndex = 1;
  let linkIndex = 1;

  root.querySelectorAll("*").forEach((element) => {
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      if (
        name.startsWith("on") ||
        ["nonce", "data-biz", "data-mid", "data-idx", "data-sn", "data-key", "data-uin"].includes(name) ||
        name.includes("ticket") ||
        name.includes("token")
      ) {
        element.removeAttribute(attr.name);
      }
    }

    if (element instanceof root.ownerDocument.defaultView!.HTMLAnchorElement) {
      const href = element.getAttribute("href") || "";
      element.setAttribute("href", sanitizePublicUrl(href, linkIndex, "link"));
      linkIndex += 1;
    }

    if (element instanceof root.ownerDocument.defaultView!.HTMLImageElement) {
      const replacement = sanitizePublicUrl(element.getAttribute("src") || "", imageIndex, "image");
      ["src", "data-src", "data-original", "wximg", "wx-src", "data-url", "longdesc"].forEach((attr) => {
        if (element.hasAttribute(attr)) {
          element.setAttribute(attr, replacement);
        }
      });
      if (!element.hasAttribute("src")) {
        element.setAttribute("src", replacement);
      }
      imageIndex += 1;
    }
  });
}

export function sanitizeFixtureHtml(contentHtml: string, fixtureName = "sample-fixture"): string {
  const dom = new JSDOM(`<div id="fixture-root">${contentHtml}</div>`);
  const document = dom.window.document;
  const root = document.querySelector("#fixture-root")!;

  root.querySelectorAll("script, iframe, object, embed, noscript").forEach((node) => node.remove());
  scrubAttributes(root);
  anonymizeTextNodes(root);

  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '  <meta charset="utf-8">',
    `  <title>${fixtureName}</title>`,
    '  <meta property="og:image" content="https://example.invalid/images/cover.png">',
    "</head>",
    "<body>",
    `  <h1 id="activity-name">${fixtureName}</h1>`,
    '  <span id="js_name">测试公众号</span>',
    '  <span id="publish_time">2026-07-12</span>',
    `  <div id="js_content">${root.innerHTML}</div>`,
    "</body>",
    "</html>"
  ].join("\n");
}
