import { describe, expect, it } from "vitest";
import { UI_COPY } from "../constants/uiCopy";

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

describe("UI_COPY", () => {
  it("does not keep retired English primary UI labels", () => {
    const text = collectStrings(UI_COPY).join("\n");

    expect(text).toContain("复制给 AI");
    expect(text).toContain("复制 Markdown");
    expect(text).toContain("下载 Markdown");
    expect(text).toContain("下载 JSON");
    expect(text).toContain("发送到工作流");
    expect(text).toContain("高级设置");
    expect(text).not.toContain("Copy for AI");
    expect(text).not.toContain("Copy Markdown");
    expect(text).not.toContain("Download Markdown");
    expect(text).not.toContain("Download JSON");
    expect(text).not.toContain("Send to workflow");
    expect(text).not.toContain("Advanced settings");
  });
});
