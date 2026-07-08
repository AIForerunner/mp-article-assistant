import type { BackendConfig } from "../types";
import { getStorageValue, setStorageValue } from "./chromeStorage";
import { STORAGE_KEYS } from "./keys";

const DEFAULT_CONFIG: BackendConfig = {
  apiBaseUrl: "",
  requestMethod: "POST",
  customHeadersJson: "",
  requestBodyTemplate: ""
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
