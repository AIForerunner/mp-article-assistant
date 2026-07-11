import { describe, expect, it } from "vitest";
import {
  AI_TEMPLATES,
  buildAgentContext,
  copyAgentContext,
  resolveAiTemplateId,
  type AiTemplateId
} from "../lib";
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
  it("builds content for the five final AI templates", () => {
    const article = createArticle();

    expect(AI_TEMPLATES).toHaveLength(5);

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

  it("does not expose the removed weekly signal template", () => {
    expect(AI_TEMPLATES.map((template) => template.name)).not.toContain("技术周刊素材");
    expect(AI_TEMPLATES.map((template) => template.id)).not.toContain("weekly-signal");
  });

  it("includes article summary requirements", () => {
    const content = buildAgentContext(createArticle(), "article-summary");

    expect(content).toContain("## 分析要求");
    expect(content).toContain("请基于文章内容完成总结");
    expect(content).toContain("用一段话说明文章主要讲了什么");
  });

  it("includes key insight requirements", () => {
    const content = buildAgentContext(createArticle(), "key-insights");

    expect(content).toContain("## 分析要求");
    expect(content).toContain("请提炼文章中的关键信息");
    expect(content).toContain("区分原文结论与可进一步推导的结论");
  });

  it("does not include template requirements for context-only template", () => {
    const content = buildAgentContext(createArticle(), "context-only");

    expect(content).not.toContain("## 任务指令");
    expect(content).not.toContain("## 任务要求");
    expect(content).not.toContain("## 分析要求");
    expect(content).not.toContain("请基于文章内容完成以下分析");
  });

  it("includes analysis requirements for task templates", () => {
    const taskTemplateIds = AI_TEMPLATES.filter((template) => template.instruction).map(
      (template) => template.id
    ) as AiTemplateId[];

    for (const templateId of taskTemplateIds) {
      const content = buildAgentContext(createArticle(), templateId);

      expect(content).toContain("## 分析要求");
    }
  });

  it("adds additional requirements to context-only output", () => {
    const content = buildAgentContext(
      createArticle(),
      "context-only",
      "  重点分析它对研发团队的影响。  "
    );

    expect(content).not.toContain("## 分析要求");
    expect(content).toContain("## 补充要求");
    expect(content).toContain("重点分析它对研发团队的影响。");
  });

  it("does not add an additional requirements section for blank text", () => {
    const content = buildAgentContext(createArticle(), "article-summary", "   \n  ");

    expect(content).not.toContain("## 补充要求");
  });

  it("keeps copyAgentContext compatible with context-only output", () => {
    const content = copyAgentContext(createArticle());

    expect(content).toContain("标题: 示例文章");
    expect(content).toContain("## 提取统计信息");
    expect(content).toContain("## 文章 Markdown");
    expect(content).not.toContain("## 任务指令");
    expect(content).not.toContain("## 任务要求");
    expect(content).not.toContain("## 分析要求");
  });

  it("falls back from legacy stored template ids", () => {
    expect(resolveAiTemplateId("general-analysis")).toBe("article-summary");
    expect(resolveAiTemplateId("weekly-signal")).toBe("article-summary");
    expect(resolveAiTemplateId("wechat-topic")).toBe("key-insights");
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
