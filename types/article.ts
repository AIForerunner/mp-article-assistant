export type OutlineLevel = 1 | 2 | 3;

export type ArticleOutlineItem = {
  level: OutlineLevel;
  text: string;
  anchor: string;
};

export type ArticleStats = {
  textLength: number;
  wordCount: number;
  imageCount: number;
  linkCount: number;
  codeBlockCount: number;
  outlineCount: number;
};

export type ArticleLink = {
  text: string;
  url: string;
};

export type ArticleCodeBlock = {
  code: string;
  language?: string;
};

export type ArticleExtractionInfo = {
  warnings: string[];
  confidence: number;
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
  accountAvatar?: string;
  coverImage?: string;
  publishTime?: string;

  contentHtml: string;
  contentText: string;

  outline: ArticleOutlineItem[];
  images: string[];
  stats?: ArticleStats;
  links?: ArticleLink[];
  codeBlocks?: ArticleCodeBlock[];
  extraction?: ArticleExtractionInfo;

  markdown?: string;

  extractedAt: string;
  extractorVersion: string;
};

export type ExtractError = {
  code: string;
  message: string;
};
