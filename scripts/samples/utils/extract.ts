import { JSDOM } from "jsdom";
import type { WeixinArticle } from "../../../types";
import { buildWeixinArticleFromContent } from "../../../lib/extractWeixinArticle";

export const ARTICLE_CONTENT_SELECTORS = ["#js_content", "#img-content", "article"] as const;

type MutableGlobal = typeof globalThis & Record<string, unknown>;

function setGlobalValue(key: string, value: unknown): void {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
}

function withDomGlobals<T>(dom: JSDOM, callback: () => T): T {
  const globalObject = globalThis as MutableGlobal;
  const previous = new Map<string, unknown>();
  const keys = [
    "window",
    "document",
    "HTMLElement",
    "HTMLImageElement",
    "HTMLAnchorElement",
    "Element",
    "Node",
    "navigator",
    "location",
    "getComputedStyle"
  ];

  keys.forEach((key) => previous.set(key, globalObject[key]));

  setGlobalValue("window", dom.window);
  setGlobalValue("document", dom.window.document);
  setGlobalValue("HTMLElement", dom.window.HTMLElement);
  setGlobalValue("HTMLImageElement", dom.window.HTMLImageElement);
  setGlobalValue("HTMLAnchorElement", dom.window.HTMLAnchorElement);
  setGlobalValue("Element", dom.window.Element);
  setGlobalValue("Node", dom.window.Node);
  setGlobalValue("navigator", dom.window.navigator);
  setGlobalValue("location", dom.window.location);
  setGlobalValue("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));

  try {
    return callback();
  } finally {
    keys.forEach((key) => {
      if (previous.get(key) === undefined) {
        Reflect.deleteProperty(globalObject, key);
      } else {
        setGlobalValue(key, previous.get(key));
      }
    });
  }
}

export function findArticleContentNode(document: Document, preferredSelector?: string): HTMLElement | null {
  const selectors = preferredSelector
    ? [preferredSelector, ...ARTICLE_CONTENT_SELECTORS.filter((selector) => selector !== preferredSelector)]
    : ARTICLE_CONTENT_SELECTORS;

  for (const selector of selectors) {
    const node = document.querySelector<HTMLElement>(selector);
    if (node) {
      return node;
    }
  }
  return null;
}

export function extractArticleFromSnapshot(input: {
  url: string;
  pageHtml: string;
  selector?: string;
  now?: Date;
}): WeixinArticle {
  const dom = new JSDOM(input.pageHtml, {
    url: input.url,
    pretendToBeVisual: true
  });

  return withDomGlobals(dom, () => {
    const content = findArticleContentNode(dom.window.document, input.selector);
    if (!content) {
      throw new Error("Article content node was not found in snapshot.");
    }
    return buildWeixinArticleFromContent(input.url, content, input.now || new Date());
  });
}
