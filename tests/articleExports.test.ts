import { describe, expect, it } from "vitest";
import { AI_TEMPLATES, buildAgentContext, type AiTemplateId } from "../lib";
import type { WeixinArticle } from "../types";

function createArticle(overrides: Partial<WeixinArticle> = {}): WeixinArticle {
  return {
    source: "weixin_mp",
    url: "https://mp.weixin.qq.com/s/demo",
    urlType: "short",
    title: "示例文章",
    author: "作者甲",
    accountName: "示例公众号",
    publishTime: "2026-07-11",
    contentHtml: "<p>正文内容</p>",
    contentText: "正文内容",
    outline: [],
    images: [],
    stats: {
      textLength: 4,
      wordCount: 4,
      imageCount: 0,
      linkCount: 1,
      codeBlockCount: 1,
      outlineCount: 0
    },
    links: [
      {
        text: "参考链接",
        url: "https://example.com/report"
      }
    ],
    codeBlocks: [
      {
        language: "ts",
        code: "const ok = true;"
      }
    ],
    extraction: {
      warnings: [],
      confidence: 0.96
    },
    markdown: "## 正文\n\n正文内容",
    extractedAt: "2026/07/11 12:00:00",
    extractorVersion: "test",
    ...overrides
  };
}

describe("buildAgentContext", () => {
  it("builds content for every AI template", () => {
    const article = createArticle();

    for (const template of AI_TEMPLATES) {
      const content = buildAgentContext(article, template.id);

      expect(content).toContain(`# ${template.name}`);
      expect(content).toContain("标题: 示例文章");
      expect(content).toContain("公众号: 示例公众号");
      expect(content).toContain("作者: 作者甲");
      expect(content).toContain("发布时间: 2026-07-11");
      expect(content).toContain("原文链接: https://mp.weixin.qq.com/s/demo");
      expect(content).toContain("## 提取统计信息");
      expect(content).toContain("## 文章 Markdown");
      expect(content).toContain("## 正文");
    }
  });

  it("does not include task instructions for context-only template", () => {
    const content = buildAgentContext(createArticle(), "context-only");

    expect(content).not.toContain("## 任务指令");
    expect(content).not.toContain("请基于文章内容完成以下分析");
  });

  it("includes task instructions for task templates", () => {
    const taskTemplateIds = AI_TEMPLATES.filter((template) => template.instruction).map(
      (template) => template.id
    ) as AiTemplateId[];

    for (const templateId of taskTemplateIds) {
      const content = buildAgentContext(createArticle(), templateId);

      expect(content).toContain("## 任务指令");
    }
  });

  it("handles missing author, publish time, links, and code blocks", () => {
    const content = buildAgentContext(
      createArticle({
        author: undefined,
        publishTime: undefined,
        links: [],
        codeBlocks: [],
        stats: {
          textLength: 4,
          wordCount: 4,
          imageCount: 0,
          linkCount: 0,
          codeBlockCount: 0,
          outlineCount: 0
        }
      }),
      "context-only"
    );

    expect(content).toContain("作者: -");
    expect(content).toContain("发布时间: -");
    expect(content).not.toContain("## Links");
    expect(content).not.toContain("## Code Blocks");
  });
});
