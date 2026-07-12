import { join } from "node:path";
import type { Browser } from "playwright";
import { parseArgs } from "./args";
import { readSamplesOrThrow } from "./jsonl";
import type { ArticleReport, CaptureMetadata, LiveSample, LoadStatus } from "./types";
import { COLLECTOR_VERSION } from "./types";
import { browserContextOptions, launchSampleBrowser } from "./utils/browser";
import { runSampleBatch } from "./utils/batch";
import { extractArticleFromSnapshot } from "./utils/extract";
import { buildArticleReport, buildFailureReport } from "./utils/metrics";
import {
  captureDirFor,
  ensureDir,
  filterSamples,
  readFailedSampleIds,
  writeCapturePayload
} from "./utils/storage";
import { generateBatchReport } from "./utils/report";
import { classifyPageError, openArticlePage, screenshotArticle } from "./utils/page";

type CollectOptions = {
  captureRoot: string;
  timeoutMs: number;
  retries: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function categoryForLoadStatus(loadStatus: LoadStatus): Parameters<typeof buildFailureReport>[0]["category"] {
  if (loadStatus === "network_error" || loadStatus === "timeout" || loadStatus === "blocked") {
    return loadStatus;
  }
  if (loadStatus === "content_not_found") {
    return "content_not_found";
  }
  if (loadStatus === "extractor_error") {
    return "extractor_error";
  }
  return "unknown";
}

function buildMetadata(input: {
  sample: LiveSample;
  browserVersion: string;
  collectedAt?: Date;
}): CaptureMetadata {
  return {
    id: input.sample.id,
    url: input.sample.url,
    expectedAccount: input.sample.account,
    expectedTitle: input.sample.title,
    tags: input.sample.tags,
    collectedAt: (input.collectedAt || new Date()).toISOString(),
    collectorVersion: COLLECTOR_VERSION,
    browserVersion: input.browserVersion
  };
}

async function writeFailedCapture(input: {
  sample: LiveSample;
  captureRoot: string;
  browserVersion: string;
  pageHtml?: string;
  contentHtml?: string;
  report: ArticleReport;
}): Promise<ArticleReport> {
  await writeCapturePayload(input.captureRoot, {
    sample: input.sample,
    metadata: buildMetadata({
      sample: input.sample,
      browserVersion: input.browserVersion
    }),
    pageHtml: input.pageHtml || "",
    contentHtml: input.contentHtml || "",
    article: null,
    markdown: "",
    report: input.report
  });
  return input.report;
}

async function collectSampleAttempt(input: {
  browser: Browser;
  sample: LiveSample;
  options: CollectOptions;
  browserVersion: string;
}): Promise<ArticleReport> {
  const startedAt = Date.now();
  const dir = captureDirFor(input.options.captureRoot, input.sample.id);
  await ensureDir(dir);

  const context = await input.browser.newContext(browserContextOptions());
  const page = await context.newPage();
  let pageHtml = "";
  let contentHtml = "";
  let selector: string | undefined;

  try {
    const openResult = await openArticlePage(page, input.sample.url, input.options.timeoutMs);
    selector = openResult.selector;
    pageHtml = await page.content().catch(() => "");

    if (openResult.blocked) {
      const report = buildFailureReport({
        sample: input.sample,
        loadStatus: "blocked",
        durationMs: Date.now() - startedAt,
        message: "Access appears blocked by login, verification, or environment restrictions.",
        category: "blocked"
      });
      await screenshotArticle(page, selector, join(dir, "screenshot.png")).catch(() => undefined);
      return writeFailedCapture({
        sample: input.sample,
        captureRoot: input.options.captureRoot,
        browserVersion: input.browserVersion,
        pageHtml,
        contentHtml,
        report
      });
    }

    if (!selector) {
      const report = buildFailureReport({
        sample: input.sample,
        loadStatus: "content_not_found",
        durationMs: Date.now() - startedAt,
        message: "Article content node was not found.",
        category: "content_not_found"
      });
      await screenshotArticle(page, selector, join(dir, "screenshot.png")).catch(() => undefined);
      return writeFailedCapture({
        sample: input.sample,
        captureRoot: input.options.captureRoot,
        browserVersion: input.browserVersion,
        pageHtml,
        contentHtml,
        report
      });
    }

    contentHtml = await page
      .locator(selector)
      .first()
      .evaluate((node) => (node as HTMLElement).outerHTML);

    const article = extractArticleFromSnapshot({
      url: input.sample.url,
      pageHtml,
      selector
    });

    await screenshotArticle(page, selector, join(dir, "screenshot.png")).catch(() => undefined);

    const report = buildArticleReport({
      sample: input.sample,
      article,
      contentHtml,
      loadStatus: "success",
      durationMs: Date.now() - startedAt
    });

    await writeCapturePayload(input.options.captureRoot, {
      sample: input.sample,
      metadata: buildMetadata({
        sample: input.sample,
        browserVersion: input.browserVersion
      }),
      pageHtml,
      contentHtml,
      article,
      markdown: article.markdown || "",
      report
    });

    return report;
  } catch (error) {
    pageHtml = pageHtml || (await page.content().catch(() => ""));
    const loadStatus = classifyPageError(error);
    const report = buildFailureReport({
      sample: input.sample,
      loadStatus,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
      category: categoryForLoadStatus(loadStatus)
    });
    await screenshotArticle(page, selector, join(dir, "screenshot.png")).catch(() => undefined);
    return writeFailedCapture({
      sample: input.sample,
      captureRoot: input.options.captureRoot,
      browserVersion: input.browserVersion,
      pageHtml,
      contentHtml,
      report
    });
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function collectSampleWithRetry(input: {
  browser: Browser;
  sample: LiveSample;
  options: CollectOptions;
  browserVersion: string;
}): Promise<ArticleReport> {
  let lastReport: ArticleReport | undefined;

  for (let attempt = 0; attempt <= input.options.retries; attempt += 1) {
    const report = await collectSampleAttempt(input);
    lastReport = report;

    if (!["network_error", "timeout", "unknown"].includes(report.loadStatus) || report.status === "blocked") {
      return report;
    }

    if (attempt < input.options.retries) {
      await sleep(1000 * (attempt + 1));
    }
  }

  return lastReport!;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const samples = await readSamplesOrThrow(args.input);
  const failedIds = args.failed ? await readFailedSampleIds(args.reportRoot) : undefined;
  const selected = filterSamples({
    samples,
    ids: args.ids,
    limit: args.limit,
    failedIds
  });

  if (selected.length === 0) {
    console.log("No samples selected.");
    return;
  }

  const browser = await launchSampleBrowser({
    headed: args.headed,
    timeoutMs: args.timeoutMs
  });
  const browserVersion = browser.version();

  try {
    console.log(
      `Collecting ${selected.length} sample(s) with concurrency=${Math.min(args.concurrency, 2)}, retries=${args.retries}.`
    );

    await runSampleBatch(
      selected,
      async (sample) =>
        collectSampleWithRetry({
          browser,
          sample,
          browserVersion,
          options: {
            captureRoot: args.captureRoot,
            timeoutMs: args.timeoutMs,
            retries: args.retries
          }
        }),
      {
        concurrency: Math.min(args.concurrency, 2),
        delayMs: args.delayMs
      }
    );

    const { summary } = await generateBatchReport({
      captureRoot: args.captureRoot,
      reportRoot: args.reportRoot,
      samples
    });

    console.log(
      `Done: total=${summary.total}, passed=${summary.passed}, warning=${summary.warning}, failed=${summary.failed}, blocked=${summary.blocked}.`
    );
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
