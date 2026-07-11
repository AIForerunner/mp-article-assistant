import type { WeixinArticle } from "../types";
import { getAiTemplate, type AiTemplateId } from "./aiTemplates";

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

function buildStatsSection(article: WeixinArticle): string[] {
  const stats = article.stats;

  return [
    `文本长度: ${stats?.textLength ?? article.contentText.length}`,
    `词数: ${stats?.wordCount ?? "-"}`,
    `图片: ${stats?.imageCount ?? article.images.length}`,
    `链接: ${stats?.linkCount ?? article.links?.length ?? 0}`,
    `代码块: ${stats?.codeBlockCount ?? article.codeBlocks?.length ?? 0}`,
    `目录项: ${stats?.outlineCount ?? article.outline.length}`,
    `Confidence: ${article.extraction?.confidence ?? "-"}`,
    `Warnings: ${article.extraction?.warnings?.length ? article.extraction.warnings.join("; ") : "-"}`
  ];
}

function buildLinksSection(article: WeixinArticle): string[] {
  const links = article.links || [];
  if (!links.length) {
    return [];
  }

  return [
    "",
    "## Links",
    ...links.map((link, index) => `${index + 1}. ${link.text || link.url}: ${link.url}`)
  ];
}

function buildCodeBlocksSection(article: WeixinArticle): string[] {
  const codeBlocks = article.codeBlocks || [];
  if (!codeBlocks.length) {
    return [];
  }

  return [
    "",
    "## Code Blocks",
    ...codeBlocks.map((block, index) => {
      const language = block.language || "";
      return [
        `Code block ${index + 1}${language ? ` (${language})` : ""}:`,
        `\`\`\`${language}`,
        block.code,
        "```"
      ].join("\n");
    })
  ];
}

export function buildAgentContext(
  article: WeixinArticle,
  templateId: AiTemplateId,
  additionalRequirement?: string
): string {
  const template = getAiTemplate(templateId);
  const trimmedRequirement = additionalRequirement?.trim();
  const sections = [
    `# ${template.name}`,
    "",
    "## 文章信息",
    `标题: ${valueOrDash(article.title)}`,
    `公众号: ${valueOrDash(article.accountName)}`,
    `作者: ${valueOrDash(article.author)}`,
    `发布时间: ${valueOrDash(article.publishTime)}`,
    `原文链接: ${article.url}`,
    `提取时间: ${valueOrDash(article.extractedAt)}`,
    `Extractor: ${article.extractorVersion}`,
    "",
    "## 提取统计信息",
    ...buildStatsSection(article),
    ...buildLinksSection(article),
    ...buildCodeBlocksSection(article),
    "",
    "## 文章 Markdown",
    article.markdown || article.contentText || ""
  ];

  if (template.instruction) {
    sections.push("", "## 分析要求", template.instruction);
  }

  if (trimmedRequirement) {
    sections.push("", "## 补充要求", trimmedRequirement);
  }

  return sections.join("\n").trim();
}

export function copyAgentContext(article: WeixinArticle): string {
  return buildAgentContext(article, "context-only");
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
