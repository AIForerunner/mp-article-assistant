import { WEIXIN_PAGE_PATTERNS } from "./constants";

export function detectWeixinArticlePage(url: string): boolean {
  return WEIXIN_PAGE_PATTERNS.some((pattern) => pattern.test(url));
}
