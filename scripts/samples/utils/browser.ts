import { chromium, type Browser, type BrowserContextOptions } from "playwright";

export const DESKTOP_CHROME_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export type BrowserOptions = {
  headed?: boolean;
  timeoutMs?: number;
};

export function browserContextOptions(): BrowserContextOptions {
  return {
    userAgent: DESKTOP_CHROME_USER_AGENT,
    viewport: { width: 1365, height: 1600 },
    deviceScaleFactor: 1,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    extraHTTPHeaders: {
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }
  };
}

export async function launchSampleBrowser(options: BrowserOptions = {}): Promise<Browser> {
  return chromium.launch({
    headless: !options.headed,
    timeout: options.timeoutMs || 30_000
  });
}
