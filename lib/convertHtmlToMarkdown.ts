import TurndownService from "turndown";

function isPlaceholderSrc(url: string): boolean {
  const value = (url || "").trim().toLowerCase();
  return value.startsWith("data:") || value.startsWith("blob:") || value === "about:blank";
}

function preprocessHtmlForMarkdown(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;

  clone.querySelectorAll("[data-outline-level]").forEach((el) => {
    const level = Number.parseInt(el.getAttribute("data-outline-level") || "0", 10);
    if (![1, 2, 3].includes(level)) {
      return;
    }

    const heading = document.createElement(`h${level}`);
    heading.innerHTML = el.innerHTML;
    el.replaceWith(heading);
  });

  clone.querySelectorAll("img").forEach((img) => {
    const candidate =
      img.getAttribute("data-src") ||
      img.getAttribute("data-original") ||
      img.getAttribute("wximg") ||
      img.getAttribute("data-url");
    const currentSrc = img.getAttribute("src") || "";

    if (candidate && (!currentSrc || isPlaceholderSrc(currentSrc))) {
      img.setAttribute("src", candidate);
    }
  });

  return clone.innerHTML;
}

export function convertHtmlToMarkdown(container: HTMLElement): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced"
  });

  turndownService.addRule("keepLineBreak", {
    filter: "br",
    replacement: () => "  \n"
  });

  const html = preprocessHtmlForMarkdown(container);
  return turndownService.turndown(html).trim();
}
