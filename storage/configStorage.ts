import type { BackendConfig } from "../types";
import { getStorageValue, setStorageValue } from "./chromeStorage";
import { STORAGE_KEYS } from "./keys";

const DEFAULT_CONFIG: BackendConfig = {
  apiBaseUrl: ""
};

export async function getBackendConfig(): Promise<BackendConfig> {
  return getStorageValue<BackendConfig>(STORAGE_KEYS.backendConfig, DEFAULT_CONFIG);
}

export async function setBackendConfig(config: BackendConfig): Promise<void> {
  await setStorageValue(STORAGE_KEYS.backendConfig, config);
}
