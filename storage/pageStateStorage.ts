import type { PageStatus, PersistedPageState } from "../types";
import { getStorageValue, setStorageValue } from "./chromeStorage";
import { STORAGE_KEYS } from "./keys";

const DEFAULT_PAGE_STATE: PersistedPageState = {
  byUrl: {}
};

export async function getPageState(url: string): Promise<Omit<PageStatus, "isWeixinArticlePage"> | undefined> {
  const all = await getStorageValue<PersistedPageState>(STORAGE_KEYS.pageState, DEFAULT_PAGE_STATE);
  return all.byUrl[url];
}

export async function setPageState(
  url: string,
  state: Omit<PageStatus, "isWeixinArticlePage">
): Promise<void> {
  const all = await getStorageValue<PersistedPageState>(STORAGE_KEYS.pageState, DEFAULT_PAGE_STATE);
  const next: PersistedPageState = {
    byUrl: {
      ...all.byUrl,
      [url]: state
    }
  };

  await setStorageValue(STORAGE_KEYS.pageState, next);
}
