import type { WeixinArticle } from "../types";

function valueOrDash(value?: string): string {
  return value?.trim() || "-";
}

function buildFileBaseName(article: WeixinArticle): string {
  const title = article.title || "weixin-article";
  const safeTitle = title
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return safeTitle || "weixin-article";
}

function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildMarkdownDocument(article: WeixinArticle): string {
  const metadataSection = [
    `Title: ${valueOrDash(article.title)}`,
    `Author: ${valueOrDash(article.author)}`,
    `Account: ${valueOrDash(article.accountName)}`,
    `Published: ${valueOrDash(article.publishTime)}`,
    `Source URL: ${article.url}`,
    `Extracted: ${valueOrDash(article.extractedAt)}`
  ].join("\n");

  return `${metadataSection}\n\n---\n\n${article.markdown || article.contentText || ""}`.trim();
}

export function copyAgentContext(article: WeixinArticle): string {
  const stats = article.stats;
  const links = article.links || [];
  const codeBlocks = article.codeBlocks || [];
  const warnings = article.extraction?.warnings || [];

  const linkSection = links.length
    ? links.map((link, index) => `${index + 1}. ${link.text}: ${link.url}`).join("\n")
    : "-";

  const codeSection = codeBlocks.length
    ? codeBlocks
        .map((block, index) => {
          const language = block.language || "";
          return `Code block ${index + 1}${language ? ` (${language})` : ""}:\n\`\`\`${language}\n${block.code}\n\`\`\``;
        })
        .join("\n\n")
    : "-";

  return [
    "# WeChat Official Account Article",
    "",
    "## Metadata",
    `Title: ${valueOrDash(article.title)}`,
    `Account: ${valueOrDash(article.accountName)}`,
    `Author: ${valueOrDash(article.author)}`,
    `Published: ${valueOrDash(article.publishTime)}`,
    `URL: ${article.url}`,
    `Extractor: ${article.extractorVersion}`,
    `Confidence: ${article.extraction?.confidence ?? "-"}`,
    `Warnings: ${warnings.length ? warnings.join("; ") : "-"}`,
    "",
    "## Stats",
    `Text length: ${stats?.textLength ?? article.contentText.length}`,
    `Words: ${stats?.wordCount ?? "-"}`,
    `Images: ${stats?.imageCount ?? article.images.length}`,
    `Links: ${stats?.linkCount ?? links.length}`,
    `Code blocks: ${stats?.codeBlockCount ?? codeBlocks.length}`,
    "",
    "## Links",
    linkSection,
    "",
    "## Code Blocks",
    codeSection,
    "",
    "## Markdown",
    article.markdown || article.contentText || ""
  ].join("\n");
}

export function downloadMarkdown(article: WeixinArticle): void {
  downloadTextFile(`${buildFileBaseName(article)}.md`, buildMarkdownDocument(article), "text/markdown;charset=utf-8");
}

export function downloadJson(article: WeixinArticle): void {
  downloadTextFile(
    `${buildFileBaseName(article)}.json`,
    JSON.stringify(article, null, 2),
    "application/json;charset=utf-8"
  );
}
