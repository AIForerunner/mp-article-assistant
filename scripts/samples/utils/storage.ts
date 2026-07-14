import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ArticleReport, CapturePayload, LiveSample, RunManifest } from "../types";

export const DEFAULT_SAMPLES_FILE = "samples/live/articles.jsonl";
export const DEFAULT_CAPTURE_ROOT = "samples/captures";
export const DEFAULT_REPORT_ROOT = "samples/reports/latest";
export const DEFAULT_FIXTURE_ROOT = "samples/fixtures";

export function captureDirFor(root: string, sampleId: string): string {
  return join(root, sampleId);
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function writeRunManifest(reportRoot: string, manifest: RunManifest): Promise<void> {
  await writeJsonFile(join(reportRoot, "manifest.json"), manifest);
}

export async function readRunManifest(reportRoot: string): Promise<RunManifest | undefined> {
  const manifestPath = join(reportRoot, "manifest.json");
  if (!existsSync(manifestPath)) {
    return undefined;
  }
  return readJsonFile<RunManifest>(manifestPath);
}

export async function writeCapturePayload(root: string, payload: CapturePayload): Promise<void> {
  const dir = captureDirFor(root, payload.sample.id);
  await ensureDir(dir);

  await Promise.all([
    writeJsonFile(join(dir, "metadata.json"), payload.metadata),
    writeFile(join(dir, "page.html"), payload.pageHtml, "utf8"),
    writeFile(join(dir, "content.html"), payload.contentHtml, "utf8"),
    writeJsonFile(join(dir, "extracted.json"), payload.article),
    writeFile(join(dir, "output.md"), payload.markdown, "utf8"),
    writeJsonFile(join(dir, "report.json"), payload.report)
  ]);
}

export async function readCaptureReports(root: string): Promise<ArticleReport[]> {
  if (!existsSync(root)) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const reports = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const reportPath = join(root, entry.name, "report.json");
        if (!existsSync(reportPath)) {
          return undefined;
        }
        return readJsonFile<ArticleReport>(reportPath);
      })
  );

  return reports.filter((report): report is ArticleReport => Boolean(report));
}

export async function readCaptureReport(root: string, sampleId: string): Promise<ArticleReport | undefined> {
  const reportPath = join(captureDirFor(root, sampleId), "report.json");
  if (!existsSync(reportPath)) {
    return undefined;
  }
  return readJsonFile<ArticleReport>(reportPath);
}

export async function readCaptureReportsByIds(
  root: string,
  sampleIds: string[],
  runId?: string
): Promise<{ reports: ArticleReport[]; missingIds: string[] }> {
  const reports: ArticleReport[] = [];
  const missingIds: string[] = [];

  for (const sampleId of sampleIds) {
    const report = await readCaptureReport(root, sampleId);
    if (report && (!runId || report.runId === runId)) {
      reports.push(report);
    } else {
      missingIds.push(sampleId);
    }
  }

  return { reports, missingIds };
}

export async function readFailedSampleIds(reportRoot: string): Promise<Set<string>> {
  const failuresPath = join(reportRoot, "failures.json");
  if (!existsSync(failuresPath)) {
    return new Set();
  }
  const failures = await readJsonFile<Array<{ id: string }>>(failuresPath);
  return new Set(failures.map((failure) => failure.id));
}

export async function cleanGeneratedSamples(): Promise<void> {
  await Promise.all([
    rm(DEFAULT_CAPTURE_ROOT, { recursive: true, force: true }),
    rm(DEFAULT_REPORT_ROOT, { recursive: true, force: true })
  ]);
}

export function filterSamples(input: {
  samples: LiveSample[];
  ids?: string[];
  limit?: number;
  failedIds?: Set<string>;
}): LiveSample[] {
  let selected = input.samples;
  if (input.ids?.length) {
    const wanted = new Set(input.ids);
    selected = selected.filter((sample) => wanted.has(sample.id));
  }
  if (input.failedIds) {
    selected = selected.filter((sample) => input.failedIds!.has(sample.id));
  }
  if (input.limit && input.limit > 0) {
    selected = selected.slice(0, input.limit);
  }
  return selected;
}
