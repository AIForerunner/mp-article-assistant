import { describe, expect, it } from "vitest";
import { buildExtractionQualitySummary, getExtractionQualityLevel } from "../lib";

describe("extractionQuality", () => {
  it("maps confidence into high, medium, and low levels", () => {
    expect(getExtractionQualityLevel(0.9)).toBe("high");
    expect(getExtractionQualityLevel(0.89)).toBe("medium");
    expect(getExtractionQualityLevel(0.7)).toBe("medium");
    expect(getExtractionQualityLevel(0.69)).toBe("low");
  });

  it("returns a good quality message when there are no warnings", () => {
    const quality = buildExtractionQualitySummary({
      confidence: 0.95,
      warnings: []
    });

    expect(quality.label).toBe("高");
    expect(quality.confidenceText).toBe("0.95");
    expect(quality.summary).toBe("提取质量良好");
  });

  it("formats warnings into readable extraction hints", () => {
    const quality = buildExtractionQualitySummary({
      confidence: 0.68,
      warnings: ["Article body is very short.", "Markdown output was empty."]
    });

    expect(quality.label).toBe("低");
    expect(quality.summary).toBe("提取提示：正文较短，请确认是否完整（共 2 条）");
    expect(quality.warnings).toEqual(["正文较短，请确认是否完整", "Markdown 内容为空"]);
  });
});
