export async function getStorageValue<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T | undefined) ?? fallback;
}

export async function setStorageValue<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
