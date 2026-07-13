import type { WeixinArticle } from "../../types";

export const COLLECTOR_VERSION = "0.5.1";

export type SampleStatus = "passed" | "warning" | "failed" | "blocked" | "skipped";

export type LoadStatus =
  | "success"
  | "network_error"
  | "timeout"
  | "blocked"
  | "content_not_found"
  | "extractor_error"
  | "unknown";

export type FailureCategory =
  | "network_error"
  | "timeout"
  | "blocked"
  | "content_not_found"
  | "metadata_missing"
  | "text_incomplete"
  | "image_incomplete"
  | "markdown_invalid"
  | "outline_invalid"
  | "extractor_error"
  | "unknown";

export type LiveSample = {
  id: string;
  source_index?: number;
  url: string;
  account: string;
  title: string;
  tags: string[];
  selection_reason?: string;
};

export type CaptureMetadata = {
  id: string;
  url: string;
  expectedAccount: string;
  expectedTitle: string;
  tags: string[];
  collectedAt: string;
  collectorVersion: string;
  browserVersion: string;
};

export type ArticleReport = {
  id: string;
  url: string;
  status: SampleStatus;
  loadStatus: LoadStatus;
  titleMatched: boolean;
  accountMatched: boolean;
  textLength: number;
  sourceTextLength: number;
  textCoverage: number;
  headPreserved: boolean;
  tailPreserved: boolean;
  imageCount: number;
  sourceImageCount: number;
  imageCoverage: number;
  validImageCount: number;
  invalidImageCount: number;
  duplicateImageCount: number;
  linkCount: number;
  sourceLinkCount: number;
  codeBlockCount: number;
  sourceCodeBlockCount: number;
  outlineCount: number;
  markdownLength: number;
  confidence: number;
  warnings: string[];
  errors: string[];
  categories: FailureCategory[];
  durationMs: number;
};

export type CapturePayload = {
  sample: LiveSample;
  metadata: CaptureMetadata;
  pageHtml: string;
  contentHtml: string;
  article: WeixinArticle | null;
  markdown: string;
  report: ArticleReport;
};

export type ReportScope = "run" | "all";

export type RunManifest = {
  runId: string;
  selectedIds: string[];
  startedAt: string;
  finishedAt?: string;
};

export type BatchSummary = {
  runId?: string;
  selectedCount: number;
  reportedCount: number;
  missingReportIds: string[];
  total: number;
  passed: number;
  warning: number;
  failed: number;
  blocked: number;
  skipped: number;
  averageTextCoverage: number;
  averageImageCoverage: number;
  missingTitleCount: number;
  missingAccountCount: number;
  emptyOutlineCount: number;
  emptyMarkdownCount: number;
  failureCategories: Partial<Record<FailureCategory | "page_load" | "outline_empty", number>>;
};

export type ExpectedFixtureAssertions = {
  titleRequired?: boolean;
  accountRequired?: boolean;
  minTextLength?: number;
  maxTextLength?: number;
  minImageCount?: number;
  maxImageCount?: number;
  minOutlineCount?: number;
  maxOutlineCount?: number;
  minLinkCount?: number;
  maxLinkCount?: number;
  expectedCodeBlockCount?: number;
  minCodeBlockCount?: number;
  maxCodeBlockCount?: number;
  markdownContains?: string[];
  markdownNotContains?: string[];
};
