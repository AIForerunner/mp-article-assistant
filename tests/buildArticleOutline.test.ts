import { describe, expect, it } from "vitest";
import { buildArticleOutline } from "../lib/buildArticleOutline";

describe("buildArticleOutline", () => {
  it("extracts semantic headings and sets anchors", () => {
    document.body.innerHTML = `
      <div id="root">
        <h1>主标题</h1>
        <h2>第二节</h2>
        <p>普通段落内容</p>
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const outline = buildArticleOutline(root);

    expect(outline.length).toBe(2);
    expect(outline[0].level).toBe(1);
    expect(outline[1].level).toBe(2);
    expect(outline[0].anchor).toMatch(/^wxa-/);
  });

  it("infers heading from style and text pattern", () => {
    document.body.innerHTML = `
      <div id="root">
        <p style="font-size:20px;font-weight:700">一、背景介绍</p>
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const outline = buildArticleOutline(root);

    expect(outline.length).toBe(1);
    expect(outline[0].level).toBe(1);
  });

  it("extracts outline from bold-only pseudo headings", () => {
    document.body.innerHTML = `
      <div id="root">
        <p><strong>01</strong></p>
        <p><strong>汽车“故事”不好讲了</strong></p>
        <p>这是正文段落，不是标题。</p>
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const outline = buildArticleOutline(root);

    expect(outline.length).toBe(1);
    expect(outline[0].text).toContain("01");
    expect(outline[0].text).toContain("不好讲了");
  });
});
