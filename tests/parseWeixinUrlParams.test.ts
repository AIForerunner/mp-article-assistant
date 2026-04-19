import { describe, expect, it } from "vitest";
import { parseWeixinUrlParams } from "../lib/parseWeixinUrlParams";

describe("parseWeixinUrlParams", () => {
  it("parses query style url", () => {
    const result = parseWeixinUrlParams(
      "https://mp.weixin.qq.com/s?__biz=abc&mid=123&idx=1&sn=token"
    );

    expect(result.urlType).toBe("query");
    expect(result.biz).toBe("abc");
    expect(result.mid).toBe("123");
    expect(result.idx).toBe("1");
    expect(result.sn).toBe("token");
  });

  it("returns unknown for invalid url", () => {
    const result = parseWeixinUrlParams("not-a-url");
    expect(result.urlType).toBe("unknown");
  });
});
