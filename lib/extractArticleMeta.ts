export type ArticleMeta = {
  title: string;
  author?: string;
  accountName?: string;
  accountAvatar?: string;
  coverImage?: string;
  publishTime?: string;
};

function pickText(selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (text) {
      return text;
    }
  }
  return undefined;
}

function pickAttr(selectors: string[], attr: string): string | undefined {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.getAttribute(attr)?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function normalizeUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value.trim().replace(/&amp;/g, "&");
  if (!cleaned) {
    return undefined;
  }

  if (cleaned.startsWith("//")) {
    return `https:${cleaned}`;
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  try {
    return new URL(cleaned, window.location.origin).toString();
  } catch {
    return cleaned;
  }
}

export function extractArticleMeta(): ArticleMeta {
  const title =
    pickText(["#activity-name", ".rich_media_title"]) || document.title || "未命名文章";

  const author = pickText(["#js_author_name", "#meta_content .rich_media_meta_nickname"]);
  const accountName = pickText(["#js_name", ".wx_follow_nickname"]);
  const accountAvatar = normalizeUrl(
    pickAttr([".wx_follow_hd .wx_follow_avatar_pic", ".wx_follow_hd .wx_follow_avatar img"], "src")
  );
  const coverImage = normalizeUrl(pickAttr([
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[property="og:image:secure_url"]'
  ], "content"));
  const publishTime = pickText(["#publish_time", ".rich_media_meta_text"]);

  return {
    title,
    author,
    accountName,
    accountAvatar,
    coverImage,
    publishTime
  };
}
