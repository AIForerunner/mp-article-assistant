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

export async function extractWeixinArticle(url: string): Promise<WeixinArticle> {
  const contentNode = await waitForStableContent();

  const meta = extractArticleMeta();
  const parsedUrl = parseWeixinUrlParams(url);
  const extracted = extractArticleContent(contentNode);
  const outline = buildArticleOutline(extracted.cleanContainer);
  const markdown = repairMarkdownImageUrls(
    convertHtmlToMarkdown(extracted.cleanContainer),
    extracted.images
  );

  const now = new Date();
  const extractedAt = now.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
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
    publishTime: meta.publishTime,
    contentHtml: extracted.cleanContainer.innerHTML,
    contentText: extracted.contentText,
    outline,
    images: extracted.images,
    markdown,
    extractedAt,
    extractorVersion: EXTRACTOR_VERSION
  };
}
