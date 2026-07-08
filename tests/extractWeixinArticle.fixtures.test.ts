import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildWeixinArticleFromContent } from "../lib/extractWeixinArticle";

function loadFixture(name: string): string {
  return readFileSync(resolve(process.cwd(), "tests", "fixtures", name), "utf8");
}

function loadArticleFixture(name: string): HTMLElement {
  document.body.innerHTML = loadFixture(name);
  const content = document.querySelector<HTMLElement>("#js_content");
  if (!content) {
    throw new Error(`Fixture ${name} is missing #js_content`);
  }
  return content;
}

describe("extractWeixinArticle fixtures", () => {
  it("extracts a short article", () => {
    const content = loadArticleFixture("short-article.html");
    const article = buildWeixinArticleFromContent(
      "https://mp.weixin.qq.com/s/short",
      content,
      new Date("2026-07-08T00:00:00Z")
    );

    expect(article.title).toBe("Short update");
    expect(article.accountName).toBe("Tiny Notes");
    expect(article.contentText).toContain("Brief but complete.");
    expect(article.markdown).toContain("Brief but complete.");
    expect(article.stats?.textLength).toBeGreaterThan(0);
    expect(article.extraction?.warnings).toContain("Article body is very short.");
  });

  it("ignores non-semantic headings in fixture content", () => {
    const content = loadArticleFixture("non-semantic-headings.html");
    const article = buildWeixinArticleFromContent("https://mp.weixin.qq.com/s/non-semantic", content);

    expect(article.outline).toHaveLength(1);
    expect(article.outline[0]).toMatchObject({
      level: 2,
      text: "Actual semantic heading"
    });
    expect(article.markdown).toContain("Looks Like A Heading");
  });

  it("normalizes image URLs", () => {
    const content = loadArticleFixture("media-links-code.html");
    const article = buildWeixinArticleFromContent("https://mp.weixin.qq.com/s/media", content);

    expect(article.images).toEqual([
      "https://mmbiz.qpic.cn/mmbiz_png/demo/640",
      "https://mmbiz.qpic.cn/mmbiz_jpg/demo/640"
    ]);
    expect(article.markdown).toContain("https://mmbiz.qpic.cn/mmbiz_png/demo/640");
  });

  it("extracts links with deduped normalized URLs", () => {
    const content = loadArticleFixture("media-links-code.html");
    const article = buildWeixinArticleFromContent("https://mp.weixin.qq.com/s/media", content);

    expect(article.links).toEqual([
      {
        text: "full report",
        url: "https://example.com/report?x=1&y=2"
      }
    ]);
    expect(article.stats?.linkCount).toBe(1);
  });

  it("extracts fenced code blocks", () => {
    const content = loadArticleFixture("media-links-code.html");
    const article = buildWeixinArticleFromContent("https://mp.weixin.qq.com/s/media", content);

    expect(article.codeBlocks).toEqual([
      {
        language: "js",
        code: "const answer = 42;\nconsole.log(answer);"
      }
    ]);
    expect(article.stats?.codeBlockCount).toBe(1);
    expect(article.markdown).toContain("```js");
  });
});
