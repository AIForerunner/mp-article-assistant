import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { parseSamplesJsonl } from "../scripts/samples/jsonl";
import type { ArticleReport, LiveSample } from "../scripts/samples/types";
import { runSampleBatch } from "../scripts/samples/utils/batch";
import { extractArticleFromSnapshot } from "../scripts/samples/utils/extract";
import {
  assertArticleAgainstExpected,
  buildExpectedAssertions,
  generateFixtureFromCapture
} from "../scripts/samples/utils/fixture";
import { generateBatchReport } from "../scripts/samples/utils/report";
import { ensureReportsForSelected } from "../scripts/samples/utils/run";
import {
  calculateImageCoverage,
  calculateTextCoverage,
  determineStatus,
  inspectMarkdown,
  summarizeReports
} from "../scripts/samples/utils/metrics";
import { roughlyMatches, sanitizeFixtureHtml } from "../scripts/samples/utils/sanitize";
import { writeCapturePayload } from "../scripts/samples/utils/storage";

const sample: LiveSample = {
  id: "sample-001",
  url: "https://mp.weixin.qq.com/s/demo",
  account: "测试公众号",
  title: "测试文章",
  tags: ["测试"]
};

function report(overrides: Partial<ArticleReport>): ArticleReport {
  return {
    id: "sample-001",
    url: "https://mp.weixin.qq.com/s/demo",
    status: "passed",
    loadStatus: "success",
    titleMatched: true,
    accountMatched: true,
    textLength: 100,
    sourceTextLength: 100,
    textCoverage: 1,
    headPreserved: true,
    tailPreserved: true,
    imageCount: 1,
    sourceImageCount: 1,
    imageCoverage: 1,
    validImageCount: 1,
    invalidImageCount: 0,
    duplicateImageCount: 0,
    linkCount: 0,
    sourceLinkCount: 0,
    codeBlockCount: 0,
    sourceCodeBlockCount: 0,
    outlineCount: 1,
    markdownLength: 100,
    confidence: 0.9,
    warnings: [],
    errors: [],
    categories: [],
    durationMs: 10,
    ...overrides
  };
}

function fixtureHtml(): string {
  return `<!doctype html>
<html>
<head><title>Fallback</title><meta property="og:image" content="https://example.invalid/cover.png"></head>
<body>
  <h1 id="activity-name">测试文章</h1>
  <span id="js_name">测试公众号</span>
  <span id="publish_time">2026-07-12</span>
  <div id="js_content">
    <h2>测试章节</h2>
    <p>这是用于静态回归的测试正文，包含足够文本用于最小长度断言。</p>
    <img src="data:image/gif;base64,AAAA" data-src="https://example.invalid/image.png">
    <a href="https://example.invalid/link">测试链接</a>
    <pre><code class="language-ts">const value = 1;</code></pre>
  </div>
</body>
</html>`;
}

describe("sample JSONL parsing", () => {
  it("parses valid JSONL input", () => {
    const result = parseSamplesJsonl(
      '{"id":"sample-001","url":"https://mp.weixin.qq.com/s/demo","account":"测试公众号","title":"测试文章","tags":["技术"]}\n'
    );

    expect(result.errors).toHaveLength(0);
    expect(result.samples[0]).toMatchObject({
      id: "sample-001",
      url: "https://mp.weixin.qq.com/s/demo",
      account: "测试公众号",
      title: "测试文章"
    });
  });

  it("detects duplicate URLs", () => {
    const lineA =
      '{"id":"sample-001","url":"https://mp.weixin.qq.com/s/demo","account":"A","title":"A","tags":[]}';
    const lineB =
      '{"id":"sample-002","url":"https://mp.weixin.qq.com/s/demo","account":"B","title":"B","tags":[]}';
    const result = parseSamplesJsonl(`${lineA}\n${lineB}`);

    expect(result.errors[0].message).toContain("Duplicate article URL");
  });

  it("detects invalid URLs", () => {
    const result = parseSamplesJsonl(
      '{"id":"sample-001","url":"https://example.com/demo","account":"A","title":"A","tags":[]}'
    );

    expect(result.errors[0].message).toContain("Invalid mp.weixin.qq.com URL");
  });
});

describe("sample quality metrics", () => {
  it("normalizes title text for approximate matching", () => {
    expect(roughlyMatches(" 机器人：AI 持续霸榜 ", "机器人 AI持续霸榜")).toBe(true);
  });

  it("normalizes account names for approximate matching", () => {
    expect(roughlyMatches("ByteDance Web Infra", "bytedance web infra")).toBe(true);
  });

  it("calculates text coverage with head and tail preservation", () => {
    const source = "开头关键文本 中间内容 ".repeat(10) + "结尾关键文本";
    const extracted = source.slice(0, -2);
    const coverage = calculateTextCoverage(source, extracted);

    expect(coverage.textCoverage).toBeGreaterThan(0.9);
    expect(coverage.headPreserved).toBe(true);
    expect(coverage.tailPreserved).toBe(true);
  });

  it("calculates image coverage and invalid image counts", () => {
    const coverage = calculateImageCoverage(
      ["https://example.invalid/a.png", "https://example.invalid/b.png"],
      ["https://example.invalid/a.png", "data:image/gif;base64,AAA", "https://example.invalid/a.png"]
    );

    expect(coverage.imageCoverage).toBe(0.5);
    expect(coverage.invalidImageCount).toBe(1);
    expect(coverage.duplicateImageCount).toBe(1);
  });

  it("detects unsafe markdown", () => {
    const inspection = inspectMarkdown("hello <script>alert(1)</script> [x](javascript:alert(1))");

    expect(inspection.errors).toEqual([
      "Markdown contains <script>.",
      "Markdown contains javascript: URL."
    ]);
  });

  it("determines status from warnings, errors, and blocked categories", () => {
    expect(determineStatus({ loadStatus: "success", warnings: [], errors: [], categories: [] })).toBe("passed");
    expect(determineStatus({ loadStatus: "success", warnings: ["warn"], errors: [], categories: [] })).toBe(
      "warning"
    );
    expect(determineStatus({ loadStatus: "success", warnings: [], errors: ["err"], categories: [] })).toBe(
      "failed"
    );
    expect(determineStatus({ loadStatus: "blocked", warnings: [], errors: [], categories: ["blocked"] })).toBe(
      "blocked"
    );
  });

  it("summarizes batch reports", () => {
    const summary = summarizeReports([
      report({ status: "passed" }),
      report({ status: "warning", warnings: ["Account name is missing."], outlineCount: 0, categories: ["outline_invalid"] }),
      report({ status: "failed", errors: ["Text coverage is too low."], categories: ["text_incomplete"] })
    ]);

    expect(summary.total).toBe(3);
    expect(summary.passed).toBe(1);
    expect(summary.warning).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.failureCategories.text_incomplete).toBe(1);
    expect(summary.failureCategories.outline_empty).toBe(1);
  });
});

describe("sample batch, fixture sanitization, and regression assertions", () => {
  it("keeps processing when one sample fails", async () => {
    const samples = [
      sample,
      { ...sample, id: "sample-002", url: "https://mp.weixin.qq.com/s/demo-2" }
    ];
    const results = await runSampleBatch(
      samples,
      async (item) => {
        if (item.id === "sample-001") {
          throw new Error("boom");
        }
        return item.id;
      },
      { concurrency: 2, delayMs: 0 }
    );

    expect(results).toEqual([
      expect.objectContaining({ sample: samples[0], ok: false }),
      expect.objectContaining({ sample: samples[1], ok: true, value: "sample-002" })
    ]);
  });

  it("sanitizes fixture HTML without leaking source text or URLs", () => {
    const sanitized = sanitizeFixtureHtml(
      '<script>bad()</script><p>真实作者和真实正文</p><img data-src="https://mmbiz.qpic.cn/private.png"><a href="https://mp.weixin.qq.com/s/private?__biz=x&pass_ticket=y">原文</a>',
      "脱敏测试"
    );

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("真实作者");
    expect(sanitized).not.toContain("mmbiz.qpic.cn");
    expect(sanitized).not.toContain("pass_ticket");
    expect(sanitized).toContain("https://example.invalid/images/");
    expect(sanitized).toContain("https://example.invalid/links/");
  });

  it("standardizes captured outerHTML to a single article root", () => {
    const sanitized = sanitizeFixtureHtml(
      '<div id="js_content" class="rich_media_content" style="color: red;"><section><div id="js_content"><p>真实正文</p></div></section></div>',
      "单根正文"
    );
    const dom = new JSDOM(sanitized);
    const roots = dom.window.document.querySelectorAll("#js_content");
    const root = roots[0] as HTMLElement;

    expect(roots).toHaveLength(1);
    expect(root.className).toBe("rich_media_content");
    expect(root.getAttribute("style")).toContain("color: red");
    expect(root.querySelector("#js_content")).toBeNull();

    const article = extractArticleFromSnapshot({
      url: "https://mp.weixin.qq.com/s/sanitized",
      pageHtml: sanitized
    });
    expect(article.contentText).toContain("测试段落");
  });

  it("runs expected.json assertions against an extracted fixture", () => {
    const article = extractArticleFromSnapshot({
      url: "https://mp.weixin.qq.com/s/demo",
      pageHtml: fixtureHtml()
    });
    const expected = buildExpectedAssertions(article);

    expect(assertArticleAgainstExpected(article, expected)).toEqual([]);
    expect(
      assertArticleAgainstExpected(article, {
        ...expected,
        markdownNotContains: ["const value = 1;"]
      })
    ).toEqual(["Expected markdown not to contain: const value = 1;"]);
  });

  it("generates a sanitized fixture from a capture directory", async () => {
    const temp = await mkdtemp(join(tmpdir(), "mp-samples-"));
    const captureRoot = join(temp, "captures");
    const fixtureRoot = join(temp, "fixtures");
    const article = extractArticleFromSnapshot({
      url: sample.url,
      pageHtml: fixtureHtml()
    });
    const generatedReport = report({ markdownLength: article.markdown?.length || 0 });

    await writeCapturePayload(captureRoot, {
      sample,
      metadata: {
        id: sample.id,
        url: sample.url,
        expectedAccount: sample.account,
        expectedTitle: sample.title,
        tags: sample.tags,
        collectedAt: "2026-07-12T00:00:00.000Z",
        collectorVersion: "0.5.1",
        browserVersion: "chromium-test"
      },
      pageHtml: fixtureHtml(),
      contentHtml: '<h2>真实章节</h2><p>真实正文</p><img data-src="https://mmbiz.qpic.cn/private.png">',
      article,
      markdown: article.markdown || "",
      report: generatedReport
    });

    await generateFixtureFromCapture({
      sampleId: sample.id,
      name: "generated-fixture",
      captureRoot,
      fixtureRoot
    });

    const generatedHtml = await readFile(join(fixtureRoot, "generated-fixture", "input.html"), "utf8");
    const expectedJson = await readFile(join(fixtureRoot, "generated-fixture", "expected.json"), "utf8");

    expect(generatedHtml).not.toContain("真实正文");
    expect(generatedHtml).not.toContain("mmbiz.qpic.cn");
    expect(new JSDOM(generatedHtml).window.document.querySelectorAll("#js_content")).toHaveLength(1);
    expect(JSON.parse(expectedJson)).toMatchObject({
      titleRequired: true,
      accountRequired: true
    });

    await rm(temp, { recursive: true, force: true });
  });

  it("writes a fallback report when a worker fails before creating a page", async () => {
    const temp = await mkdtemp(join(tmpdir(), "mp-samples-"));
    const captureRoot = join(temp, "captures");

    const result = await ensureReportsForSelected({
      selected: [sample],
      captureRoot,
      browserVersion: "chromium-test",
      batchResults: [{ sample, ok: false, error: new Error("newPage failed") }]
    });

    expect(result.missingReportIds).toEqual([sample.id]);
    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]).toMatchObject({
      id: sample.id,
      status: "failed",
      loadStatus: "unknown",
      categories: ["unknown"]
    });
    expect(result.reports[0].errors[0]).toContain("newPage failed");

    await rm(temp, { recursive: true, force: true });
  });

  it("writes a fallback report when a worker fails while writing capture files", async () => {
    const temp = await mkdtemp(join(tmpdir(), "mp-samples-"));
    const captureRoot = join(temp, "captures");

    const result = await ensureReportsForSelected({
      selected: [sample],
      captureRoot,
      browserVersion: "chromium-test",
      batchResults: [{ sample, ok: false, error: new Error("writeCapturePayload failed") }]
    });

    expect(result.reports[0].errors[0]).toContain("writeCapturePayload failed");
    expect(result.reports[0].status).toBe("failed");

    await rm(temp, { recursive: true, force: true });
  });

  it("summarizes only the current run and backfills missing selected reports", async () => {
    const temp = await mkdtemp(join(tmpdir(), "mp-samples-"));
    const captureRoot = join(temp, "captures");
    const reportRoot = join(temp, "reports");
    const sampleTwo = {
      ...sample,
      id: "sample-002",
      url: "https://mp.weixin.qq.com/s/demo-2",
      title: "测试文章二"
    };
    const oldSample = {
      ...sample,
      id: "sample-999",
      url: "https://mp.weixin.qq.com/s/old",
      title: "旧样本"
    };

    await writeCapturePayload(captureRoot, {
      sample,
      metadata: {
        id: sample.id,
        url: sample.url,
        expectedAccount: sample.account,
        expectedTitle: sample.title,
        tags: sample.tags,
        collectedAt: "2026-07-12T00:00:00.000Z",
        collectorVersion: "0.5.1",
        browserVersion: "chromium-test"
      },
      pageHtml: "",
      contentHtml: "",
      article: null,
      markdown: "",
      report: report({ id: sample.id })
    });
    await writeCapturePayload(captureRoot, {
      sample: oldSample,
      metadata: {
        id: oldSample.id,
        url: oldSample.url,
        expectedAccount: oldSample.account,
        expectedTitle: oldSample.title,
        tags: oldSample.tags,
        collectedAt: "2026-07-12T00:00:00.000Z",
        collectorVersion: "0.5.1",
        browserVersion: "chromium-test"
      },
      pageHtml: "",
      contentHtml: "",
      article: null,
      markdown: "",
      report: report({ id: oldSample.id, status: "failed", errors: ["old failure"], categories: ["unknown"] })
    });

    const ensured = await ensureReportsForSelected({
      selected: [sample, sampleTwo],
      captureRoot,
      browserVersion: "chromium-test",
      batchResults: [{ sample: sampleTwo, ok: false, error: new Error("worker failed") }]
    });
    const { summary, reports } = await generateBatchReport({
      captureRoot,
      reportRoot,
      samples: [sample, sampleTwo, oldSample],
      selectedIds: [sample.id, sampleTwo.id],
      missingReportIds: ensured.missingReportIds,
      manifest: {
        runId: "run-test",
        selectedIds: [sample.id, sampleTwo.id],
        startedAt: "2026-07-12T00:00:00.000Z",
        finishedAt: "2026-07-12T00:01:00.000Z"
      }
    });

    expect(reports.map((item) => item.id).sort()).toEqual([sample.id, sampleTwo.id]);
    expect(summary).toMatchObject({
      runId: "run-test",
      total: 2,
      selectedCount: 2,
      reportedCount: 2,
      failed: 1,
      missingReportIds: [sampleTwo.id]
    });

    await rm(temp, { recursive: true, force: true });
  });
});
