export function scrollToAnchor(anchor: string): void {
  const target = document.querySelector<HTMLElement>(`[data-wechat-anchor='${anchor}'], #${anchor}`);

  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
