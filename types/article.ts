export type OutlineLevel = 1 | 2 | 3;

export type ArticleOutlineItem = {
  level: OutlineLevel;
  text: string;
  anchor: string;
};

export type WeixinArticle = {
  source: "weixin_mp";
  url: string;
  urlType: "short" | "query" | "unknown";

  biz?: string;
  mid?: string;
  idx?: string;
  sn?: string;

  title: string;
  author?: string;
  accountName?: string;
  publishTime?: string;

  contentHtml: string;
  contentText: string;

  outline: ArticleOutlineItem[];
  images: string[];

  markdown?: string;

  extractedAt: string;
  extractorVersion: string;
};

export type ExtractError = {
  code: string;
  message: string;
};
