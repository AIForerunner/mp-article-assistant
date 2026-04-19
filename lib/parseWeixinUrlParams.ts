export type ParsedWeixinUrl = {
  urlType: "short" | "query" | "unknown";
  biz?: string;
  mid?: string;
  idx?: string;
  sn?: string;
};

export function parseWeixinUrlParams(rawUrl: string): ParsedWeixinUrl {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { urlType: "unknown" };
  }

  const pathType = url.pathname.startsWith("/s/")
    ? "short"
    : url.pathname === "/s"
      ? "query"
      : "unknown";

  const biz = url.searchParams.get("__biz") ?? undefined;
  const mid = url.searchParams.get("mid") ?? undefined;
  const idx = url.searchParams.get("idx") ?? undefined;
  const sn = url.searchParams.get("sn") ?? undefined;

  return {
    urlType: pathType,
    biz,
    mid,
    idx,
    sn
  };
}
