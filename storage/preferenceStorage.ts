import type { UserPreference } from "../types";
import { DEFAULT_AI_TEMPLATE_ID } from "../lib/aiTemplates";
import { getStorageValue, setStorageValue } from "./chromeStorage";
import { STORAGE_KEYS } from "./keys";

const DEFAULT_PREFERENCE: UserPreference = {
  autoExtractOnStable: true,
  aiTemplateId: DEFAULT_AI_TEMPLATE_ID
};

export async function getUserPreference(): Promise<UserPreference> {
  return getStorageValue<UserPreference>(STORAGE_KEYS.preference, DEFAULT_PREFERENCE);
}

export async function setUserPreference(preference: UserPreference): Promise<void> {
  await setStorageValue(STORAGE_KEYS.preference, preference);
}
