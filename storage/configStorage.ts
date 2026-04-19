import type { BackendConfig } from "../types";
import { getStorageValue, setStorageValue } from "./chromeStorage";
import { STORAGE_KEYS } from "./keys";

const DEFAULT_BODY_TEMPLATE = JSON.stringify(
  {
    workflow_id: "7630469077471281204",
    app_id: "7630113285274877961",
    parameters: {
      url: "{{url}}",
      title: "{{title}}",
      content: "{{content}}",
      account: "{{account}}",
      follow_avatar: "{{follow_avatar}}",
      create_time: "{{create_time}}"
    }
  },
  null,
  2
);

const DEFAULT_CONFIG: BackendConfig = {
  apiBaseUrl: "https://api.coze.cn/v1/workflow/stream_run",
  requestMethod: "POST",
  customHeadersJson: JSON.stringify({ "Content-Type": "application/json" }, null, 2),
  requestBodyTemplate: DEFAULT_BODY_TEMPLATE
};

export async function getBackendConfig(): Promise<BackendConfig> {
  const stored = await getStorageValue<BackendConfig | undefined>(STORAGE_KEYS.backendConfig, undefined);
  if (!stored) {
    return DEFAULT_CONFIG;
  }

  return {
    ...DEFAULT_CONFIG,
    ...stored
  };
}

export async function setBackendConfig(config: BackendConfig): Promise<void> {
  await setStorageValue(STORAGE_KEYS.backendConfig, config);
}
