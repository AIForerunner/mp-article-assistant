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
  it("contains the product-closing copy for primary and secondary actions", () => {
    const values = collectStrings(UI_COPY);

    expect(values).toContain("复制到 AI");
    expect(values).toContain("复制文章 Markdown");
    expect(values).toContain("发送到自定义接口");
    expect(values).toContain("补充要求（可选）");
    expect(values).toContain("复制文章内容和所选分析要求，可直接粘贴到 AI 对话中。");
    expect(values).toContain("复制结构化文章上下文，可粘贴到 AI 对话后自行提问。");
    expect(values).toContain("复制文章上下文和本次补充要求，可直接粘贴到 AI 对话中。");
    expect(values).toContain("复制文章 Markdown：仅复制整理后的文章文档，适合笔记、归档和知识库。");
    expect(values).toContain("将文章发送到你配置的知识库、工作流或自建服务。");
    expect(values).not.toContain("复制给 AI");
    expect(values).not.toContain("带分析要求复制给 AI");
    expect(values).not.toContain("发送到工作流");
  });

  it("does not keep retired English primary UI labels", () => {
    const text = collectStrings(UI_COPY).join("\n");

    expect(text).not.toContain("Copy for AI");
    expect(text).not.toContain("Copy Markdown");
    expect(text).not.toContain("Download Markdown");
    expect(text).not.toContain("Download JSON");
    expect(text).not.toContain("Send to workflow");
    expect(text).not.toContain("Advanced settings");
  });
});
