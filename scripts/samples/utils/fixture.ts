import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WeixinArticle } from "../../../types";
import type { ExpectedFixtureAssertions } from "../types";
import { extractArticleFromSnapshot } from "./extract";
import { sanitizeFixtureHtml } from "./sanitize";
import { ensureDir, readJsonFile, writeJsonFile } from "./storage";

export function buildExpectedAssertions(article: WeixinArticle): ExpectedFixtureAssertions {
  const expected: ExpectedFixtureAssertions = {
    titleRequired: true,
    accountRequired: true,
    minTextLength: Math.max(1, Math.floor(article.contentText.length * 0.8)),
    minImageCount: Math.max(0, article.images.length),
    minOutlineCount: Math.max(0, article.outline.length),
    minLinkCount: Math.max(0, article.links?.length || 0),
    markdownNotContains: ["<script", "javascript:", "about:blank", "data:"]
  };

  if ((article.codeBlocks?.length || 0) > 0) {
    expected.expectedCodeBlockCount = article.codeBlocks!.length;
  }

  const markdown = article.markdown || "";
  const firstHeading = article.outline[0]?.text;
  if (firstHeading && markdown.includes(firstHeading)) {
    expected.markdownContains = [firstHeading];
  }

  return expected;
}

export function assertArticleAgainstExpected(
  article: WeixinArticle,
  expected: ExpectedFixtureAssertions
): string[] {
  const errors: string[] = [];
  const markdown = article.markdown || "";
  const imageCount = article.images.length;
  const outlineCount = article.outline.length;
  const linkCount = article.links?.length || 0;
  const codeBlockCount = article.codeBlocks?.length || 0;

  if (expected.titleRequired && !article.title.trim()) {
    errors.push("Expected a non-empty title.");
  }
  if (expected.accountRequired && !article.accountName?.trim()) {
    errors.push("Expected a non-empty account name.");
  }
  if (expected.minTextLength !== undefined && article.contentText.length < expected.minTextLength) {
    errors.push(`Expected text length >= ${expected.minTextLength}, got ${article.contentText.length}.`);
  }
  if (expected.maxTextLength !== undefined && article.contentText.length > expected.maxTextLength) {
    errors.push(`Expected text length <= ${expected.maxTextLength}, got ${article.contentText.length}.`);
  }
  if (expected.minImageCount !== undefined && imageCount < expected.minImageCount) {
    errors.push(`Expected image count >= ${expected.minImageCount}, got ${imageCount}.`);
  }
  if (expected.maxImageCount !== undefined && imageCount > expected.maxImageCount) {
    errors.push(`Expected image count <= ${expected.maxImageCount}, got ${imageCount}.`);
  }
  if (expected.minOutlineCount !== undefined && outlineCount < expected.minOutlineCount) {
    errors.push(`Expected outline count >= ${expected.minOutlineCount}, got ${outlineCount}.`);
  }
  if (expected.maxOutlineCount !== undefined && outlineCount > expected.maxOutlineCount) {
    errors.push(`Expected outline count <= ${expected.maxOutlineCount}, got ${outlineCount}.`);
  }
  if (expected.minLinkCount !== undefined && linkCount < expected.minLinkCount) {
    errors.push(`Expected link count >= ${expected.minLinkCount}, got ${linkCount}.`);
  }
  if (expected.maxLinkCount !== undefined && linkCount > expected.maxLinkCount) {
    errors.push(`Expected link count <= ${expected.maxLinkCount}, got ${linkCount}.`);
  }
  if (expected.expectedCodeBlockCount !== undefined && codeBlockCount !== expected.expectedCodeBlockCount) {
    errors.push(`Expected code block count ${expected.expectedCodeBlockCount}, got ${codeBlockCount}.`);
  }
  if (expected.minCodeBlockCount !== undefined && codeBlockCount < expected.minCodeBlockCount) {
    errors.push(`Expected code block count >= ${expected.minCodeBlockCount}, got ${codeBlockCount}.`);
  }
  if (expected.maxCodeBlockCount !== undefined && codeBlockCount > expected.maxCodeBlockCount) {
    errors.push(`Expected code block count <= ${expected.maxCodeBlockCount}, got ${codeBlockCount}.`);
  }

  expected.markdownContains?.forEach((needle) => {
    if (!markdown.includes(needle)) {
      errors.push(`Expected markdown to contain: ${needle}`);
    }
  });
  expected.markdownNotContains?.forEach((needle) => {
    if (markdown.includes(needle)) {
      errors.push(`Expected markdown not to contain: ${needle}`);
    }
  });

  return errors;
}

export async function generateFixtureFromCapture(input: {
  sampleId: string;
  name: string;
  captureRoot: string;
  fixtureRoot: string;
}): Promise<void> {
  const captureDir = join(input.captureRoot, input.sampleId);
  const contentHtml = await readFile(join(captureDir, "content.html"), "utf8");
  const sanitizedHtml = sanitizeFixtureHtml(contentHtml, input.name);
  const article = extractArticleFromSnapshot({
    url: `https://mp.weixin.qq.com/s/${input.name}`,
    pageHtml: sanitizedHtml
  });
  const expected = buildExpectedAssertions(article);
  const fixtureDir = join(input.fixtureRoot, input.name);

  await ensureDir(fixtureDir);
  await Promise.all([
    writeFile(join(fixtureDir, "input.html"), sanitizedHtml, "utf8"),
    writeJsonFile(join(fixtureDir, "expected.json"), expected)
  ]);
}

export async function loadFixtureExpected(path: string): Promise<ExpectedFixtureAssertions> {
  return readJsonFile<ExpectedFixtureAssertions>(path);
}
