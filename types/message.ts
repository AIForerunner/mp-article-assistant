import type { WeixinArticle } from "./article";
import type { BackendConfig, UserPreference } from "./config";

type MessageBase<TAction extends string, TPayload> = {
  scope: "weixin-article-assistant";
  action: TAction;
  payload: TPayload;
};

export type SendArticleMessage = MessageBase<"SEND_ARTICLE", { article: WeixinArticle; }>;

export type GetBackendConfigMessage = MessageBase<"GET_BACKEND_CONFIG", Record<string, never>>;

export type SetBackendConfigMessage = MessageBase<"SET_BACKEND_CONFIG", { config: BackendConfig; }>;

export type GetPreferenceMessage = MessageBase<"GET_PREFERENCE", Record<string, never>>;

export type SetPreferenceMessage = MessageBase<"SET_PREFERENCE", { preference: UserPreference; }>;

export type BackgroundMessage =
  | SendArticleMessage
  | GetBackendConfigMessage
  | SetBackendConfigMessage
  | GetPreferenceMessage
  | SetPreferenceMessage;

export type MessageResponse<TData = unknown> = {
  ok: boolean;
  data?: TData;
  error?: string;
};
