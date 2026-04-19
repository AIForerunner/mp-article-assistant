import { describe, expect, it } from "vitest";
import { buildArticleOutline } from "../lib/buildArticleOutline";

describe("buildArticleOutline", () => {
  it("extracts semantic headings and sets anchors", () => {
    document.body.innerHTML = `
      <div id="root">
        <h1>主标题</h1>
        <h2>第二节</h2>
        <h3>第三节</h3>
        <p>普通段落内容</p>
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const outline = buildArticleOutline(root);

    expect(outline.length).toBe(3);
    expect(outline[0].level).toBe(1);
    expect(outline[1].level).toBe(2);
    expect(outline[2].level).toBe(3);
    expect(outline[0].anchor).toMatch(/^wxa-/);
  });

  it("ignores non-heading tags and very short text", () => {
    document.body.innerHTML = `
      <div id="root">
        <h1>真正的标题</h1>
        <p><strong>这是粗体但不是h标签</strong></p>
        <p>普通段落不会被提取</p>
        <h2>第二个标题</h2>
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const outline = buildArticleOutline(root);

    expect(outline.length).toBe(2);
    expect(outline[0].text).toBe("真正的标题");
    expect(outline[1].text).toBe("第二个标题");
  });

  it("handles numeric section markers in headings", () => {
    document.body.innerHTML = `
      <div id="root">
        <h2>01</h2>
        <h2>汽车故事不好讲了</h2>
        <h2>02</h2>
        <h2>新能源的新路径</h2>
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const outline = buildArticleOutline(root);

    // Should merge numeric markers with following headings
    expect(outline.length).toBe(2);
    expect(outline[0].text).toContain("01");
    expect(outline[0].text).toContain("汽车故事不好讲了");
    expect(outline[1].text).toContain("02");
    expect(outline[1].text).toContain("新能源的新路径");
  });
});
