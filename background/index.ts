import type { BackgroundMessage, MessageResponse } from "../types";
import { getBackendConfig, getUserPreference, setBackendConfig, setUserPreference } from "../storage";

function resolveTargetUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const parsed = new URL(trimmed);
  return parsed.toString();
}

function parseHeaders(rawHeaders?: string): Record<string, string> {
  if (!rawHeaders?.trim()) {
    return {};
  }

  const parsed = JSON.parse(rawHeaders);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("请求头必须是 JSON 对象");
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined || value === null) {
      continue;
    }

    result[key] = String(value);
  }

  return result;
}

function hasHeader(headers: Record<string, string>, headerName: string): boolean {
  const target = headerName.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
}

function buildArticleTemplateContext(message: Extract<BackgroundMessage, { action: "SEND_ARTICLE"; }>): Record<string, unknown> {
  const extracted = message.payload.article;
  return {
    url: extracted.url || "",
    title: extracted.title || "",
    content: extracted.markdown || "",
    content_text: extracted.contentText || "",
    content_html: extracted.contentHtml || "",
    account: extracted.accountName || "",
    follow_avatar: extracted.accountAvatar || "",
    create_time: extracted.publishTime || "",
    author: extracted.author || "",
    source: extracted.source,
    extracted_at: extracted.extractedAt || "",
    biz: extracted.biz || "",
    mid: extracted.mid || "",
    idx: extracted.idx || "",
    sn: extracted.sn || "",
    article: extracted
  };
}

function replaceTemplateString(template: string, context: Record<string, unknown>): unknown {
  const singleTokenPattern = /^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/;
  const matchedToken = template.match(singleTokenPattern);
  if (matchedToken) {
    const value = context[matchedToken[1]];
    return value ?? "";
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, key: string) => {
    const value = context[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function applyTemplate(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    return replaceTemplateString(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyTemplate(item, context));
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = applyTemplate(item, context);
    }
    return result;
  }

  return value;
}

function buildRequestBody(message: Extract<BackgroundMessage, { action: "SEND_ARTICLE"; }>, rawTemplate?: string): unknown {
  if (!rawTemplate?.trim()) {
    return message.payload.article;
  }

  const parsed = JSON.parse(rawTemplate);
  const context = buildArticleTemplateContext(message);
  return applyTemplate(parsed, context);
}

async function postArticleToBackend(payload: BackgroundMessage): Promise<MessageResponse> {
  if (payload.action !== "SEND_ARTICLE") {
    return { ok: false, error: "invalid action" };
  }

  const config = await getBackendConfig();
  if (!config.apiBaseUrl) {
    return { ok: false, error: "后端地址未配置" };
  }

  let target: string;
  let headers: Record<string, string>;
  let body: unknown;

  try {
    target = resolveTargetUrl(config.apiBaseUrl);
    headers = parseHeaders(config.customHeadersJson);
    body = buildRequestBody(payload, config.requestBodyTemplate);
  } catch (error) {
    const message = error instanceof Error ? error.message : "后端配置解析失败";
    return { ok: false, error: `配置错误: ${message}` };
  }

  if (!hasHeader(headers, "Content-Type")) {
    headers["Content-Type"] = "application/json";
  }

  if (config.apiToken && !hasHeader(headers, "Authorization")) {
    headers.Authorization = `Bearer ${config.apiToken}`;
  }

  const response = await fetch(target, {
    method: config.requestMethod || "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    return { ok: false, error: `发送失败: ${response.status} ${message}` };
  }

  return { ok: true, data: { status: "sent" } };
}

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  if (!message || message.scope !== "weixin-article-assistant") {
    return false;
  }

  ; (async () => {
    try {
      switch (message.action) {
        case "SEND_ARTICLE": {
          sendResponse(await postArticleToBackend(message));
          break;
        }
        case "GET_BACKEND_CONFIG": {
          const config = await getBackendConfig();
          sendResponse({ ok: true, data: config } satisfies MessageResponse);
          break;
        }
        case "SET_BACKEND_CONFIG": {
          await setBackendConfig(message.payload.config);
          sendResponse({ ok: true } satisfies MessageResponse);
          break;
        }
        case "GET_PREFERENCE": {
          const preference = await getUserPreference();
          sendResponse({ ok: true, data: preference } satisfies MessageResponse);
          break;
        }
        case "SET_PREFERENCE": {
          await setUserPreference(message.payload.preference);
          sendResponse({ ok: true } satisfies MessageResponse);
          break;
        }
        default:
          sendResponse({ ok: false, error: "未知消息类型" } satisfies MessageResponse);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      sendResponse({ ok: false, error: errorMessage } satisfies MessageResponse);
    }
  })();

  return true;
});
