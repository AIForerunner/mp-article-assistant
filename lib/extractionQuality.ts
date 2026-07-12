import type { ArticleExtractionInfo } from "../types";

export type ExtractionQualityLevel = "high" | "medium" | "low";

export type ExtractionQualitySummary = {
  level: ExtractionQualityLevel;
  label: "高" | "中" | "低";
  confidence: number | undefined;
  confidenceText: string;
  warnings: string[];
  summary: string;
};

const WARNING_COPY: Record<string, string> = {
  "Article title was not found.": "未识别到文章标题",
  "Account name was not found.": "未识别到公众号名称",
  "Article body was empty.": "未提取到正文内容",
  "Article body is very short.": "正文较短，请确认是否完整",
  "Markdown output was empty.": "Markdown 内容为空"
};

export function getExtractionQualityLevel(confidence: number | undefined): ExtractionQualityLevel {
  if (typeof confidence !== "number") {
    return "low";
  }

  if (confidence >= 0.9) {
    return "high";
  }

  if (confidence >= 0.7) {
    return "medium";
  }

  return "low";
}

export function getExtractionQualityLabel(level: ExtractionQualityLevel): "高" | "中" | "低" {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "低";
}

export function formatExtractionWarning(warning: string): string {
  return WARNING_COPY[warning] || warning;
}

export function buildExtractionQualitySummary(
  extraction: ArticleExtractionInfo | undefined
): ExtractionQualitySummary {
  const confidence = extraction?.confidence;
  const level = getExtractionQualityLevel(confidence);
  const warnings = (extraction?.warnings || []).map(formatExtractionWarning);

  return {
    level,
    label: getExtractionQualityLabel(level),
    confidence,
    confidenceText: typeof confidence === "number" ? confidence.toFixed(2) : "-",
    warnings,
    summary: warnings.length
      ? `提取提示：${warnings[0]}${warnings.length > 1 ? `（共 ${warnings.length} 条）` : ""}`
      : "提取质量良好"
  };
}
