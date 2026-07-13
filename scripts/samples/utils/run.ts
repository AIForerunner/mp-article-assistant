import { randomUUID } from "node:crypto";
import type { BatchResult } from "./batch";
import { buildFailureReport } from "./metrics";
import {
  readCaptureReportsByIds,
  writeCapturePayload,
  writeRunManifest
} from "./storage";
import { COLLECTOR_VERSION, type ArticleReport, type CaptureMetadata, type LiveSample, type RunManifest } from "../types";

export function createRunManifest(selected: LiveSample[], now = new Date()): RunManifest {
  return {
    runId: `${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
    selectedIds: selected.map((sample) => sample.id),
    startedAt: now.toISOString()
  };
}

export function finishRunManifest(manifest: RunManifest, now = new Date()): RunManifest {
  return {
    ...manifest,
    finishedAt: now.toISOString()
  };
}

function buildMetadata(sample: LiveSample, browserVersion: string): CaptureMetadata {
  return {
    id: sample.id,
    url: sample.url,
    expectedAccount: sample.account,
    expectedTitle: sample.title,
    tags: sample.tags,
    collectedAt: new Date().toISOString(),
    collectorVersion: COLLECTOR_VERSION,
    browserVersion
  };
}

function errorMessageFor(sample: LiveSample, batchResults: BatchResult<ArticleReport>[]): string {
  const result = batchResults.find((item) => item.sample.id === sample.id);
  if (result?.error) {
    return result.error.message;
  }
  return "Sample did not produce report.json during this run.";
}

export async function ensureReportsForSelected(input: {
  selected: LiveSample[];
  captureRoot: string;
  browserVersion: string;
  batchResults?: BatchResult<ArticleReport>[];
}): Promise<{ reports: ArticleReport[]; missingReportIds: string[] }> {
  const selectedIds = input.selected.map((sample) => sample.id);
  const before = await readCaptureReportsByIds(input.captureRoot, selectedIds);
  const missingSamples = input.selected.filter((sample) => before.missingIds.includes(sample.id));

  for (const sample of missingSamples) {
    const report = buildFailureReport({
      sample,
      loadStatus: "unknown",
      durationMs: 0,
      message: errorMessageFor(sample, input.batchResults || []),
      category: "unknown"
    });

    await writeCapturePayload(input.captureRoot, {
      sample,
      metadata: buildMetadata(sample, input.browserVersion),
      pageHtml: "",
      contentHtml: "",
      article: null,
      markdown: "",
      report
    });
  }

  const after = await readCaptureReportsByIds(input.captureRoot, selectedIds);
  return {
    reports: after.reports,
    missingReportIds: before.missingIds
  };
}

export async function writeLatestRunManifest(reportRoot: string, manifest: RunManifest): Promise<void> {
  await writeRunManifest(reportRoot, manifest);
}
