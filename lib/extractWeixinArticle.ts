import type { WeixinArticle } from "../types";
import { EXTRACTOR_VERSION } from "./constants";
import { buildArticleOutline } from "./buildArticleOutline";
import { convertHtmlToMarkdown } from "./convertHtmlToMarkdown";
import { extractArticleContent } from "./extractArticleContent";
import { extractArticleMeta } from "./extractArticleMeta";
import { parseWeixinUrlParams } from "./parseWeixinUrlParams";
import { waitForStableContent } from "./waitForStableContent";

function isPlaceholderImageUrl(url: string): boolean {
  const value = (url || "").trim().toLowerCase();
  return (
    !value ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value === "about:blank"
  );
}

function repairMarkdownImageUrls(markdown: string, images: string[]): string {
  if (!markdown || images.length === 0) {
    return markdown;
  }

  let occurrence = 0;
  const pattern = /!\[([^\]]*)\]\((?:<)?([^\s)><]+)(?:>)?\)/g;

  return markdown.replace(pattern, (full, altText: string, rawUrl: string) => {
    const fallbackUrl = images[occurrence] || "";
    occurrence += 1;

    if (!isPlaceholderImageUrl(rawUrl) || !fallbackUrl) {
      return full;
    }

    return `![${altText}](${fallbackUrl})`;
  });
}

function estimateWordCount(text: string): number {
  const matches = text.match(/[A-Za-z0-9_]+|[\u4e00-\u9fff]/g);
  return matches?.length || 0;
}

function clampConfidence(value: number): number {
  return Math.max(0.1, Math.min(0.99, Number(value.toFixed(2))));
}

function buildExtractionInfo(input: {
  title: string;
  accountName?: string;
  contentText: string;
  markdown: string;
}): WeixinArticle["extraction"] {
  const warnings: string[] = [];

  if (!input.title || input.title === "未命名文章") {
    warnings.push("Article title was not found.");
  }

  if (!input.accountName) {
    warnings.push("Account name was not found.");
  }

  if (!input.contentText) {
    warnings.push("Article body was empty.");
  } else if (input.contentText.length < 80) {
    warnings.push("Article body is very short.");
  }

  if (!input.markdown) {
    warnings.push("Markdown output was empty.");
  }

  return {
    warnings,
    confidence: clampConfidence(0.98 - warnings.length * 0.12)
  };
}

function formatExtractedAt(now: Date): string {
  return now.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function buildWeixinArticleFromContent(
  url: string,
  contentNode: HTMLElement,
  now = new Date()
): WeixinArticle {
  const meta = extractArticleMeta();
  const parsedUrl = parseWeixinUrlParams(url);
  const extracted = extractArticleContent(contentNode);
  const outline = buildArticleOutline(extracted.cleanContainer);
  const markdown = repairMarkdownImageUrls(
    convertHtmlToMarkdown(extracted.cleanContainer),
    extracted.images
  );

  const extraction = buildExtractionInfo({
    title: meta.title,
    accountName: meta.accountName,
    contentText: extracted.contentText,
    markdown
  });

  return {
    source: "weixin_mp",
    url,
    urlType: parsedUrl.urlType,
    biz: parsedUrl.biz,
    mid: parsedUrl.mid,
    idx: parsedUrl.idx,
    sn: parsedUrl.sn,
    title: meta.title,
    author: meta.author,
    accountName: meta.accountName,
    accountAvatar: meta.accountAvatar,
    coverImage: meta.coverImage,
    publishTime: meta.publishTime,
    contentHtml: extracted.cleanContainer.innerHTML,
    contentText: extracted.contentText,
    outline,
    images: extracted.images,
    stats: {
      textLength: extracted.contentText.length,
      wordCount: estimateWordCount(extracted.contentText),
      imageCount: extracted.images.length,
      linkCount: extracted.links.length,
      codeBlockCount: extracted.codeBlocks.length,
      outlineCount: outline.length
    },
    links: extracted.links,
    codeBlocks: extracted.codeBlocks,
    extraction,
    markdown,
    extractedAt: formatExtractedAt(now),
    extractorVersion: EXTRACTOR_VERSION
  };
}

export async function extractWeixinArticle(url: string): Promise<WeixinArticle> {
  const contentNode = await waitForStableContent();
  return buildWeixinArticleFromContent(url, contentNode);
}
