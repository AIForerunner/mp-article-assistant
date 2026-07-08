import type { ArticleCodeBlock, ArticleLink } from "../types";

function cleanNode(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll(
      "script, style, iframe, .js_uneditable, .weui-msg, .share_media_text, .rich_media_tool"
    )
    .forEach((el) => el.remove());

  clone.querySelectorAll("img").forEach((img) => {
    const candidate =
      img.getAttribute("data-src") ||
      img.getAttribute("data-original") ||
      img.getAttribute("wximg") ||
      img.getAttribute("data-url");

    const currentSrc = img.getAttribute("src") || "";
    const shouldReplace = !currentSrc || isPlaceholderSrc(currentSrc);

    if (candidate && shouldReplace) {
      const normalized = normalizeImageUrl(candidate);
      if (normalized) {
        img.setAttribute("src", normalized);
      }
    }
  });

  return clone;
}

function isPlaceholderSrc(url: string): boolean {
  const value = (url || "").trim().toLowerCase();
  return value.startsWith("data:") || value.startsWith("blob:") || value === "about:blank";
}

function normalizeImageUrl(url: string): string {
  if (!url) return "";

  url = url
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/&amp;/g, "&");

  // 跳过 data: URI 和占位符
  if (url.startsWith("data:") || url.startsWith("blob:") || url === "about:blank") {
    return "";
  }

  // 处理协议相对路径 //xxx
  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  // 已是完整 URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // 处理主机开头但缺协议的 URL，例如 mmbiz.qpic.cn/xxx
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(url)) {
    return `https://${url}`;
  }

  // 处理绝对/相对路径
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return "";
  }
}

function normalizeContentUrl(url: string): string {
  if (!url) return "";

  const cleaned = url.trim().replace(/^['"]|['"]$/g, "").replace(/&amp;/g, "&");
  if (
    !cleaned ||
    cleaned.startsWith("#") ||
    /^javascript:/i.test(cleaned) ||
    /^data:/i.test(cleaned) ||
    /^blob:/i.test(cleaned)
  ) {
    return "";
  }

  if (cleaned.startsWith("//")) {
    return `https:${cleaned}`;
  }

  if (/^https?:\/\//i.test(cleaned) || /^mailto:/i.test(cleaned)) {
    return cleaned;
  }

  try {
    return new URL(cleaned, window.location.href).toString();
  } catch {
    return "";
  }
}

function normalizeVisibleText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractLinks(container: HTMLElement): ArticleLink[] {
  const links: ArticleLink[] = [];
  const seenUrls = new Set<string>();

  container.querySelectorAll("a[href]").forEach((anchor) => {
    const rawHref = anchor.getAttribute("href") || "";
    const url = normalizeContentUrl(rawHref);
    if (!url || seenUrls.has(url)) {
      return;
    }

    seenUrls.add(url);
    links.push({
      text: normalizeVisibleText(anchor.textContent || "") || url,
      url
    });
  });

  return links;
}

function detectCodeLanguage(node: Element): string | undefined {
  const className = node.getAttribute("class") || "";
  const matched = className.match(/(?:language|lang)-([a-z0-9_+-]+)/i) || className.match(/brush:\s*([a-z0-9_+-]+)/i);
  return matched?.[1]?.toLowerCase();
}

function extractCodeBlocks(container: HTMLElement): ArticleCodeBlock[] {
  const blocks: ArticleCodeBlock[] = [];
  const seenCode = new Set<string>();

  container.querySelectorAll("pre, .code-snippet__js, .code-snippet").forEach((block) => {
    const codeNode = block.querySelector("code") || block;
    const code = (codeNode.textContent || "").replace(/\n{3,}/g, "\n\n").trim();

    if (!code || seenCode.has(code)) {
      return;
    }

    seenCode.add(code);
    blocks.push({
      code,
      language: detectCodeLanguage(codeNode) || detectCodeLanguage(block) || undefined
    });
  });

  return blocks;
}

export type ExtractedContent = {
  cleanContainer: HTMLElement;
  contentHtml: string;
  contentText: string;
  images: string[];
  links: ArticleLink[];
  codeBlocks: ArticleCodeBlock[];
};

export function extractArticleContent(node: HTMLElement): ExtractedContent {
  // 从原始节点提取所有可能的图片地址
  const imageSet = new Set<string>();

  node.querySelectorAll("img").forEach((img) => {
    // 依次尝试多个属性获取图片地址
    const sources = [
      img.getAttribute("data-src"),
      img.getAttribute("data-original"),
      img.getAttribute("wximg"),
      img.getAttribute("wx-src"),
      img.getAttribute("src"),
      img.getAttribute("data-url"),
      img.getAttribute("longdesc")
    ];

    for (const source of sources) {
      if (source) {
        const normalized = normalizeImageUrl(source);
        if (normalized) {
          imageSet.add(normalized);
          break;
        }
      }
    }
  });

  const cleanContainer = cleanNode(node);
  const links = extractLinks(cleanContainer);
  const codeBlocks = extractCodeBlocks(cleanContainer);

  return {
    cleanContainer,
    contentHtml: cleanContainer.innerHTML,
    contentText: cleanContainer.textContent?.replace(/\s+/g, " ").trim() || "",
    images: Array.from(imageSet),
    links,
    codeBlocks
  };
}
