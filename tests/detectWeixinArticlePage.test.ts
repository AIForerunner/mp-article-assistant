import { describe, expect, it } from "vitest";
import { detectWeixinArticlePage } from "../lib/detectWeixinArticlePage";

describe("detectWeixinArticlePage", () => {
  it("matches supported paths", () => {
    expect(detectWeixinArticlePage("https://mp.weixin.qq.com/s/AbCdEf")).toBe(true);
    expect(detectWeixinArticlePage("https://mp.weixin.qq.com/s?__biz=xx")).toBe(true);
  });

  it("rejects non target paths", () => {
    expect(detectWeixinArticlePage("https://example.com")).toBe(false);
  });
});
