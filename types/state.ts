import type { WeixinArticle } from "./article";

export type SendStatus = "idle" | "sending" | "success" | "failed";

export type ExtractStatus = "idle" | "extracting" | "success" | "failed";

export type PageStatus = {
  isWeixinArticlePage: boolean;
  extractStatus: ExtractStatus;
  sendStatus: SendStatus;
  lastError?: string;
  lastExtractedAt?: string;
  article?: WeixinArticle;
};

export type PersistedPageState = {
  byUrl: Record<string, Omit<PageStatus, "isWeixinArticlePage">>;
};
