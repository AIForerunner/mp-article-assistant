import { JSDOM } from "jsdom";
import type { WeixinArticle } from "../../../types";
import type {
  ArticleReport,
  BatchSummary,
  FailureCategory,
  LiveSample,
  LoadStatus,
  SampleStatus
} from "../types";
import {
  isPlaceholderUrl,
  normalizeCoverageText,
  roughlyMatches
} from "./sanitize";

export type TextCoverageResult = {
  sourceTextLength: number;
  extractedTextLength: number;
  charCoverage: number;
  headPreserved: boolean;
  tailPreserved: boolean;
  textCoverage: number;
};

export type ImageCoverageResult = {
  sourceImageCount: number;
  imageCount: number;
  imageCoverage: number;
  validImageCount: number;
  invalidImageCount: number;
  duplicateImageCount: number;
};

export type MarkdownInspection = {
  markdownLength: number;
  codeBlockCount: number;
  imageLinkCount: number;
  invalidImageLinkCount: number;
  hasScript: boolean;
  hasJavascriptUrl: boolean;
  hasExcessiveRawHtml: boolean;
  warnings: string[];
  errors: string[];
};

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(4));
}

function textFromHtml(html: string): string {
  if (!html.trim()) return "";
  const dom = new JSDOM(html);
  dom.window.document.querySelectorAll("script, style, iframe, noscript").forEach((node) => node.remove());
  return dom.window.document.body.textContent || "";
}

function normalizeUrl(raw: string): string {
  const value = raw.trim().replace(/&amp;/g, "&");
  if (
    !value ||
    value.startsWith("#") ||
    /^javascript:/i.test(value) ||
    /^data:/i.test(value) ||
    /^blob:/i.test(value) ||
    isPlaceholderUrl(value)
  ) {
    return "";
  }
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  try {
    return new URL(value, "https://mp.weixin.qq.com").toString();
  } catch {
    return "";
  }
}

export function extractImageSourcesFromHtml(html: string): string[] {
  if (!html.trim()) return [];
  const dom = new JSDOM(html);
  const images: string[] = [];

  dom.window.document.querySelectorAll("img").forEach((img) => {
    const sources = [
      img.getAttribute("data-src"),
      img.getAttribute("data-original"),
      img.getAttribute("wximg"),
      img.getAttribute("wx-src"),
      img.getAttribute("src"),
      img.getAttribute("data-url"),
      img.getAttribute("longdesc")
    ];
    const normalized = sources.map((source) => normalizeUrl(source || "")).find(Boolean);
    if (normalized) {
      images.push(normalized);
    }
  });

  return images;
}

export function countLinksFromHtml(html: string): number {
  if (!html.trim()) return 0;
  const dom = new JSDOM(html);
  let count = 0;
  dom.window.document.querySelectorAll("a[href]").forEach((anchor) => {
    const href = normalizeUrl(anchor.getAttribute("href") || "");
    if (/^(https?:|mailto:)/i.test(href)) {
      count += 1;
    }
  });
  return count;
}

export function countCodeBlocksFromHtml(html: string): number {
  if (!html.trim()) return 0;
  const dom = new JSDOM(html);
  return dom.window.document.querySelectorAll("pre, code, .code-snippet, .code-snippet__js").length;
}

export function countHeadingElementsFromHtml(html: string): number {
  if (!html.trim()) return 0;
  const dom = new JSDOM(html);
  return dom.window.document.querySelectorAll("h1, h2, h3").length;
}

function chunkScore(chunk: string, extracted: string): number {
  if (!chunk) return 1;
  if (extracted.includes(chunk)) return 1;

  const segmentSize = Math.min(12, Math.max(4, Math.floor(chunk.length / 6)));
  const segments: string[] = [];
  for (let index = 0; index < chunk.length; index += segmentSize) {
    const segment = chunk.slice(index, index + segmentSize);
    if (segment.length >= 4) {
      segments.push(segment);
    }
  }

  if (segments.length === 0) {
    return extracted.includes(chunk) ? 1 : 0;
  }

  const matched = segments.filter((segment) => extracted.includes(segment)).length;
  return matched / segments.length;
}

function boundaryChunk(text: string, side: "head" | "tail"): string {
  if (text.length <= 100) return text;
  return side === "head" ? text.slice(0, 100) : text.slice(-100);
}

export function calculateTextCoverage(sourceText: string, extractedText: string): TextCoverageResult {
  const source = normalizeCoverageText(sourceText);
  const extracted = normalizeCoverageText(extractedText);

  if (!source) {
    return {
      sourceTextLength: 0,
      extractedTextLength: extracted.length,
      charCoverage: 0,
      headPreserved: false,
      tailPreserved: false,
      textCoverage: 0
    };
  }

  const charCoverage = Math.min(extracted.length / source.length, 1);
  const headScore = chunkScore(boundaryChunk(source, "head"), extracted);
  const tailScore = chunkScore(boundaryChunk(source, "tail"), extracted);
  const textCoverage = charCoverage * 0.7 + headScore * 0.15 + tailScore * 0.15;

  return {
    sourceTextLength: source.length,
    extractedTextLength: extracted.length,
    charCoverage: roundMetric(charCoverage),
    headPreserved: headScore >= 0.75,
    tailPreserved: tailScore >= 0.75,
    textCoverage: roundMetric(Math.min(textCoverage, 1))
  };
}

export function calculateImageCoverage(sourceImages: string[], extractedImages: string[]): ImageCoverageResult {
  const sourceUnique = Array.from(new Set(sourceImages.map(normalizeUrl).filter(Boolean)));
  const normalizedExtracted = extractedImages.map((url) => normalizeUrl(url || ""));
  const validExtracted = normalizedExtracted.filter(Boolean);
  const extractedUnique = new Set(validExtracted);
  const invalidImageCount = extractedImages.filter((url) => isPlaceholderUrl(url)).length;
  const duplicateImageCount = Math.max(0, validExtracted.length - extractedUnique.size);

  let matched = 0;
  sourceUnique.forEach((source) => {
    if (extractedUnique.has(source)) {
      matched += 1;
    }
  });

  return {
    sourceImageCount: sourceUnique.length,
    imageCount: extractedImages.length,
    imageCoverage: sourceUnique.length === 0 ? 1 : roundMetric(matched / sourceUnique.length),
    validImageCount: validExtracted.length,
    invalidImageCount,
    duplicateImageCount
  };
}

export function inspectMarkdown(markdown?: string): MarkdownInspection {
  const value = markdown || "";
  const imageLinks = Array.from(value.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)).map((match) =>
    match[1].replace(/^<|>$/g, "").trim()
  );
  const rawHtmlMatches = value.match(/<\/?[a-z][\s\S]*?>/gi) || [];
  const codeFenceCount = (value.match(/```/g) || []).length;
  const warnings: string[] = [];
  const errors: string[] = [];

  const hasScript = /<script\b/i.test(value);
  const hasJavascriptUrl = /javascript:/i.test(value);
  const invalidImageLinkCount = imageLinks.filter((url) => isPlaceholderUrl(url)).length;
  const hasExcessiveRawHtml = rawHtmlMatches.length > 8 || rawHtmlMatches.join("").length > value.length * 0.08;

  if (!value.trim()) {
    errors.push("Markdown output is empty.");
  }
  if (hasScript) {
    errors.push("Markdown contains <script>.");
  }
  if (hasJavascriptUrl) {
    errors.push("Markdown contains javascript: URL.");
  }
  if (invalidImageLinkCount > 0) {
    warnings.push("Markdown contains invalid image links.");
  }
  if (hasExcessiveRawHtml) {
    warnings.push("Markdown contains excessive raw HTML.");
  }

  return {
    markdownLength: value.length,
    codeBlockCount: Math.floor(codeFenceCount / 2),
    imageLinkCount: imageLinks.length,
    invalidImageLinkCount,
    hasScript,
    hasJavascriptUrl,
    hasExcessiveRawHtml,
    warnings,
    errors
  };
}

function outlineAnchorErrors(article: WeixinArticle): string[] {
  if (!article.outline.length) {
    return [];
  }
  const dom = new JSDOM(`<div id="root">${article.contentHtml}</div>`);
  return article.outline.flatMap((item) => {
    if (!item.text.trim()) {
      return [`Outline item has empty text for anchor ${item.anchor}.`];
    }
    if (item.text.length > 120) {
      return [`Outline item is too long: ${item.text.slice(0, 40)}.`];
    }
    const escapedAttr = item.anchor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const found =
      dom.window.document.getElementById(item.anchor) ||
      dom.window.document.querySelector(`[data-wechat-anchor="${escapedAttr}"]`);
    return found ? [] : [`Outline anchor is missing in content DOM: ${item.anchor}.`];
  });
}

function outlineDuplicateWarnings(article: WeixinArticle): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  article.outline.forEach((item) => {
    const key = `${item.level}:${item.text.trim()}`;
    if (seen.has(key)) {
      warnings.push(`Duplicate outline title: ${item.text}.`);
    }
    seen.add(key);
  });
  return warnings;
}

export function determineStatus(input: {
  loadStatus: LoadStatus;
  warnings: string[];
  errors: string[];
  categories: FailureCategory[];
}): SampleStatus {
  if (input.loadStatus === "blocked" || input.categories.includes("blocked")) {
    return "blocked";
  }
  if (input.errors.length > 0) {
    return "failed";
  }
  if (input.warnings.length > 0) {
    return "warning";
  }
  return "passed";
}

export function buildFailureReport(input: {
  sample: LiveSample;
  loadStatus: LoadStatus;
  durationMs: number;
  message: string;
  category?: FailureCategory;
}): ArticleReport {
  const category = input.category || (input.loadStatus === "timeout" ? "timeout" : "unknown");
  const categories = Array.from(new Set<FailureCategory>([category]));
  const errors = input.loadStatus === "blocked" ? [] : [input.message];
  const warnings = input.loadStatus === "blocked" ? [input.message] : [];

  return {
    id: input.sample.id,
    url: input.sample.url,
    status: determineStatus({
      loadStatus: input.loadStatus,
      warnings,
      errors,
      categories
    }),
    loadStatus: input.loadStatus,
    titleMatched: false,
    accountMatched: false,
    textLength: 0,
    sourceTextLength: 0,
    textCoverage: 0,
    headPreserved: false,
    tailPreserved: false,
    imageCount: 0,
    sourceImageCount: 0,
    imageCoverage: 0,
    validImageCount: 0,
    invalidImageCount: 0,
    duplicateImageCount: 0,
    linkCount: 0,
    sourceLinkCount: 0,
    codeBlockCount: 0,
    sourceCodeBlockCount: 0,
    outlineCount: 0,
    markdownLength: 0,
    confidence: 0,
    warnings,
    errors,
    categories,
    durationMs: input.durationMs
  };
}

export function buildArticleReport(input: {
  sample: LiveSample;
  article: WeixinArticle;
  contentHtml: string;
  loadStatus: LoadStatus;
  durationMs: number;
}): ArticleReport {
  const warnings = [...(input.article.extraction?.warnings || [])];
  const errors: string[] = [];
  const categories: FailureCategory[] = [];

  const sourceText = textFromHtml(input.contentHtml);
  const textCoverage = calculateTextCoverage(sourceText, input.article.contentText || "");
  const imageCoverage = calculateImageCoverage(
    extractImageSourcesFromHtml(input.contentHtml),
    input.article.images || []
  );
  const markdown = inspectMarkdown(input.article.markdown);
  const titleMatched = roughlyMatches(input.article.title, input.sample.title);
  const accountMatched = roughlyMatches(input.article.accountName, input.sample.account);
  const sourceHeadingCount = countHeadingElementsFromHtml(input.contentHtml);
  const outlineErrors = outlineAnchorErrors(input.article);
  const outlineWarnings = outlineDuplicateWarnings(input.article);

  if (!input.article.title || input.article.title === "未命名文章") {
    errors.push("Article title is missing.");
    categories.push("metadata_missing");
  } else if (!titleMatched) {
    warnings.push("Article title does not approximately match the sample title.");
  }

  if (!input.article.accountName) {
    warnings.push("Account name is missing.");
    categories.push("metadata_missing");
  } else if (!accountMatched) {
    warnings.push("Account name does not approximately match the sample account.");
  }

  if (!input.article.url || input.article.url !== input.sample.url) {
    warnings.push("Article source URL differs from the sample URL.");
  }
  if (!input.article.publishTime) {
    warnings.push("Publish time was not detected.");
  }
  if (!input.article.coverImage) {
    warnings.push("Cover image was not detected.");
  }

  if (textCoverage.sourceTextLength > 0 && textCoverage.textCoverage < 0.8) {
    errors.push(`Text coverage is too low: ${textCoverage.textCoverage}.`);
    categories.push("text_incomplete");
  } else if (textCoverage.sourceTextLength > 0 && textCoverage.textCoverage < 0.95) {
    warnings.push(`Text coverage is below target: ${textCoverage.textCoverage}.`);
    categories.push("text_incomplete");
  }
  if (!textCoverage.headPreserved && textCoverage.sourceTextLength > 40) {
    warnings.push("Source text head was not clearly preserved.");
  }
  if (!textCoverage.tailPreserved && textCoverage.sourceTextLength > 40) {
    warnings.push("Source text tail was not clearly preserved.");
  }

  if (imageCoverage.sourceImageCount > 0 && imageCoverage.imageCoverage < 0.5) {
    errors.push(`Image coverage is too low: ${imageCoverage.imageCoverage}.`);
    categories.push("image_incomplete");
  } else if (imageCoverage.sourceImageCount > 0 && imageCoverage.imageCoverage < 0.85) {
    warnings.push(`Image coverage is below target: ${imageCoverage.imageCoverage}.`);
    categories.push("image_incomplete");
  }
  if (imageCoverage.invalidImageCount > 0) {
    warnings.push(`Invalid image URLs remain: ${imageCoverage.invalidImageCount}.`);
  }
  if (imageCoverage.duplicateImageCount > 0) {
    warnings.push(`Duplicate image URLs found: ${imageCoverage.duplicateImageCount}.`);
  }

  markdown.warnings.forEach((warning) => warnings.push(warning));
  markdown.errors.forEach((error) => {
    errors.push(error);
    categories.push("markdown_invalid");
  });

  outlineWarnings.forEach((warning) => warnings.push(warning));
  outlineErrors.forEach((error) => {
    errors.push(error);
    categories.push("outline_invalid");
  });
  if (sourceHeadingCount > 0 && input.article.outline.length === 0) {
    warnings.push("Source contains heading elements, but outline is empty.");
    categories.push("outline_invalid");
  }

  const uniqueCategories = Array.from(new Set(categories));
  const status = determineStatus({
    loadStatus: input.loadStatus,
    warnings,
    errors,
    categories: uniqueCategories
  });

  return {
    id: input.sample.id,
    url: input.sample.url,
    status,
    loadStatus: input.loadStatus,
    titleMatched,
    accountMatched,
    textLength: textCoverage.extractedTextLength,
    sourceTextLength: textCoverage.sourceTextLength,
    textCoverage: textCoverage.textCoverage,
    headPreserved: textCoverage.headPreserved,
    tailPreserved: textCoverage.tailPreserved,
    imageCount: imageCoverage.imageCount,
    sourceImageCount: imageCoverage.sourceImageCount,
    imageCoverage: imageCoverage.imageCoverage,
    validImageCount: imageCoverage.validImageCount,
    invalidImageCount: imageCoverage.invalidImageCount,
    duplicateImageCount: imageCoverage.duplicateImageCount,
    linkCount: input.article.links?.length || 0,
    sourceLinkCount: countLinksFromHtml(input.contentHtml),
    codeBlockCount: input.article.codeBlocks?.length || markdown.codeBlockCount,
    sourceCodeBlockCount: countCodeBlocksFromHtml(input.contentHtml),
    outlineCount: input.article.outline.length,
    markdownLength: markdown.markdownLength,
    confidence: input.article.extraction?.confidence || 0,
    warnings,
    errors,
    categories: uniqueCategories,
    durationMs: input.durationMs
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function summarizeReports(reports: ArticleReport[]): BatchSummary {
  const summary: BatchSummary = {
    total: reports.length,
    passed: 0,
    warning: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    averageTextCoverage: average(reports.map((report) => report.textCoverage)),
    averageImageCoverage: average(reports.map((report) => report.imageCoverage)),
    missingTitleCount: reports.filter((report) => report.errors.some((error) => /title is missing/i.test(error))).length,
    missingAccountCount: reports.filter((report) =>
      report.warnings.some((warning) => /account name is missing/i.test(warning))
    ).length,
    emptyOutlineCount: reports.filter((report) => report.outlineCount === 0).length,
    emptyMarkdownCount: reports.filter((report) => report.markdownLength === 0).length,
    failureCategories: {}
  };

  reports.forEach((report) => {
    summary[report.status] += 1;
    if (report.loadStatus !== "success") {
      summary.failureCategories.page_load = (summary.failureCategories.page_load || 0) + 1;
    }
    if (report.outlineCount === 0) {
      summary.failureCategories.outline_empty = (summary.failureCategories.outline_empty || 0) + 1;
    }
    report.categories.forEach((category) => {
      summary.failureCategories[category] = (summary.failureCategories[category] || 0) + 1;
    });
  });

  return summary;
}
