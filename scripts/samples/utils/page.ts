import type { Page } from "playwright";
import { ARTICLE_CONTENT_SELECTORS } from "./extract";

export type OpenArticleResult = {
  selector?: string;
  blocked: boolean;
};

const BLOCKED_PATTERNS = [
  /访问频繁/,
  /安全验证/,
  /环境异常/,
  /请在微信客户端打开/,
  /登录后可继续/,
  /verify/i,
  /captcha/i
];

export function classifyPageError(error: unknown): "timeout" | "network_error" | "unknown" {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout/i.test(message)) {
    return "timeout";
  }
  if (/net::|ERR_|ECONN|ENOTFOUND|ETIMEDOUT|socket|network/i.test(message)) {
    return "network_error";
  }
  return "unknown";
}

export async function detectAccessBlocked(page: Page): Promise<boolean> {
  const [title, bodyText] = await Promise.all([
    page.title().catch(() => ""),
    page.locator("body").innerText({ timeout: 1500 }).catch(() => "")
  ]);
  const text = `${title}\n${bodyText.slice(0, 2000)}`;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export async function waitForArticleSelector(page: Page, timeoutMs: number): Promise<string | undefined> {
  const handle = await page
    .waitForFunction(
      (selectors) => selectors.find((selector) => document.querySelector(selector)),
      ARTICLE_CONTENT_SELECTORS,
      { timeout: timeoutMs }
    )
    .catch(() => null);

  if (!handle) {
    return undefined;
  }

  return (await handle.jsonValue()) as string | undefined;
}

export async function waitForStableArticleContent(page: Page, selector: string, timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();
  let lastSignature = "";
  let stableTicks = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const signature = await page
      .locator(selector)
      .first()
      .evaluate((node) => {
        const element = node as HTMLElement;
        return `${element.innerHTML.length}:${(element.textContent || "").length}`;
      })
      .catch(() => "");

    if (signature && signature === lastSignature) {
      stableTicks += 1;
      if (stableTicks >= 2) {
        return;
      }
    } else {
      stableTicks = 0;
      lastSignature = signature;
    }

    await page.waitForTimeout(500);
  }
}

export async function openArticlePage(page: Page, url: string, timeoutMs: number): Promise<OpenArticleResult> {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: timeoutMs
  });

  await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 8000) }).catch(() => undefined);

  if (await detectAccessBlocked(page)) {
    return { blocked: true };
  }

  const selector = await waitForArticleSelector(page, timeoutMs);
  if (!selector) {
    return { blocked: false };
  }

  await waitForStableArticleContent(page, selector);
  return { selector, blocked: await detectAccessBlocked(page) };
}

export async function screenshotArticle(page: Page, selector: string | undefined, path: string): Promise<void> {
  if (selector) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      await locator.screenshot({ path, timeout: 5000 }).catch(async () => {
        await page.screenshot({ path, fullPage: true, timeout: 5000 });
      });
      return;
    }
  }

  await page.screenshot({ path, fullPage: true, timeout: 5000 });
}
