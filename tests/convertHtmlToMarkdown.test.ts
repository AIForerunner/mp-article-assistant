import { describe, expect, it } from "vitest";
import { convertHtmlToMarkdown } from "../lib/convertHtmlToMarkdown";

describe("convertHtmlToMarkdown", () => {
  it("converts cleaned html into markdown", () => {
    document.body.innerHTML = `
      <div id="root">
        <p data-outline-level="2"><strong>章节一</strong></p>
        <p>这里是正文。</p>
        <ul><li>条目A</li></ul>
        <img data-src="https://example.com/a.png" />
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const markdown = convertHtmlToMarkdown(root);

    expect(markdown).toContain("## **章节一**");
    expect(markdown).toContain("这里是正文");
    expect(markdown).toContain("-   条目A");
    expect(markdown).toContain("https://example.com/a.png");
  });
});
