import { join } from "node:path";
import type { ArticleReport, BatchSummary, LiveSample, ReportScope, RunManifest } from "../types";
import { summarizeReports } from "./metrics";
import { ensureDir, readCaptureReports, readCaptureReportsByIds, writeJsonFile } from "./storage";
import { writeFile } from "node:fs/promises";

function sampleLabel(sampleById: Map<string, LiveSample>, report: ArticleReport, field: "account" | "title"): string {
  return sampleById.get(report.id)?.[field] || "";
}

function issueText(report: ArticleReport): string {
  const issues = [...report.errors, ...report.warnings].slice(0, 3);
  return issues.length > 0 ? issues.join("<br>") : report.loadStatus;
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    page_load: "页面加载",
    outline_empty: "Outline 为空",
    network_error: "网络错误",
    timeout: "超时",
    blocked: "访问受阻",
    content_not_found: "正文节点缺失",
    metadata_missing: "元信息缺失",
    text_incomplete: "正文覆盖率不足",
    image_incomplete: "图片覆盖率不足",
    markdown_invalid: "Markdown 无效",
    outline_invalid: "Outline 异常",
    extractor_error: "抽取器错误",
    unknown: "未知错误"
  };
  return labels[category] || category;
}

function suggestedFixes(summary: BatchSummary): string[] {
  const suggestions: string[] = [];
  if ((summary.failureCategories.outline_empty || 0) > 0 || (summary.failureCategories.outline_invalid || 0) > 0) {
    suggestions.push("非语义标题识别与 Outline 锚点稳定性");
  }
  if ((summary.failureCategories.image_incomplete || 0) > 0) {
    suggestions.push("懒加载图片地址恢复与占位符清理");
  }
  if ((summary.failureCategories.text_incomplete || 0) > 0) {
    suggestions.push("深层 section 正文清洗和首尾段保留");
  }
  if ((summary.failureCategories.markdown_invalid || 0) > 0) {
    suggestions.push("Markdown 安全过滤和 HTML 残留清理");
  }
  if (suggestions.length === 0) {
    suggestions.push("持续补充有代表性的脱敏 fixture");
  }
  return suggestions;
}

export function renderSummaryMarkdown(input: {
  summary: BatchSummary;
  reports: ArticleReport[];
  samples: LiveSample[];
}): string {
  const sampleById = new Map(input.samples.map((sample) => [sample.id, sample]));
  const failed = input.reports.filter((report) => ["failed", "blocked"].includes(report.status));
  const categoryEntries = Object.entries(input.summary.failureCategories).sort((a, b) => b[1] - a[1]);
  const suggestions = suggestedFixes(input.summary);

  return [
    "# 公众号文章采集报告",
    "",
    ...(input.summary.runId ? [`运行 ID：${input.summary.runId}`] : []),
    `选择样本：${input.summary.selectedCount}`,
    `已生成报告：${input.summary.reportedCount}`,
    ...(input.summary.missingReportIds.length
      ? [`补充失败报告：${input.summary.missingReportIds.join(", ")}`]
      : []),
    `总样本：${input.summary.total}`,
    `通过：${input.summary.passed}`,
    `警告：${input.summary.warning}`,
    `失败：${input.summary.failed}`,
    `受阻：${input.summary.blocked}`,
    "",
    "## 失败样本",
    "",
    "| ID | 公众号 | 标题 | 问题 |",
    "|---|---|---|---|",
    ...(failed.length
      ? failed.map(
          (report) =>
            `| ${report.id} | ${sampleLabel(sampleById, report, "account")} | ${sampleLabel(
              sampleById,
              report,
              "title"
            )} | ${issueText(report)} |`
        )
      : ["| - | - | - | 暂无失败或受阻样本 |"]),
    "",
    "## 主要问题分布",
    "",
    ...(categoryEntries.length
      ? categoryEntries.map(([category, count]) => `- ${categoryLabel(category)}：${count}`)
      : ["- 暂无明显问题分布"]),
    "",
    "## 建议优先修复",
    "",
    ...suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`),
    ""
  ].join("\n");
}

export async function generateBatchReport(input: {
  captureRoot: string;
  reportRoot: string;
  samples: LiveSample[];
  scope?: ReportScope;
  manifest?: RunManifest;
  selectedIds?: string[];
  missingReportIds?: string[];
}): Promise<{ summary: BatchSummary; reports: ArticleReport[] }> {
  const scope = input.scope || "run";
  const selectedIds = input.selectedIds || input.manifest?.selectedIds || [];
  const scopedReports =
    scope === "all"
      ? { reports: await readCaptureReports(input.captureRoot), missingIds: [] }
      : await readCaptureReportsByIds(input.captureRoot, selectedIds, input.manifest?.runId);
  const missingReportIds = input.missingReportIds || scopedReports.missingIds;
  const summary = summarizeReports(scopedReports.reports, {
    runId: input.manifest?.runId,
    selectedCount: scope === "all" ? scopedReports.reports.length : selectedIds.length,
    missingReportIds
  });
  const failures = scopedReports.reports.filter((report) => ["failed", "blocked"].includes(report.status));
  const summaryMarkdown = renderSummaryMarkdown({ summary, reports: scopedReports.reports, samples: input.samples });

  await ensureDir(input.reportRoot);
  await Promise.all([
    writeJsonFile(join(input.reportRoot, "summary.json"), summary),
    writeJsonFile(join(input.reportRoot, "failures.json"), failures),
    writeFile(join(input.reportRoot, "summary.md"), summaryMarkdown, "utf8")
  ]);

  return { summary, reports: scopedReports.reports };
}
