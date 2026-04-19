import type { BackgroundMessage, MessageResponse } from "../types";
import { getBackendConfig, getUserPreference, setBackendConfig, setUserPreference } from "../storage";

async function postArticleToBackend(payload: BackgroundMessage): Promise<MessageResponse> {
  if (payload.action !== "SEND_ARTICLE") {
    return { ok: false, error: "invalid action" };
  }

  const config = await getBackendConfig();
  if (!config.apiBaseUrl) {
    return { ok: false, error: "后端地址未配置" };
  }

  const target = new URL("/api/articles/collect", config.apiBaseUrl).toString();

  const response = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : {})
    },
    body: JSON.stringify(payload.payload.article)
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
