export type ArticleMeta = {
  title: string;
  author?: string;
  accountName?: string;
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

export function extractArticleMeta(): ArticleMeta {
  const title =
    pickText(["#activity-name", ".rich_media_title"]) || document.title || "未命名文章";

  const author = pickText(["#js_author_name", "#meta_content .rich_media_meta_nickname"]);
  const accountName = pickText(["#js_name", ".wx_follow_nickname"]);
  const publishTime = pickText(["#publish_time", ".rich_media_meta_text"]);

  return {
    title,
    author,
    accountName,
    publishTime
  };
}
