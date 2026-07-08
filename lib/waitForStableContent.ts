type WaitOptions = {
  timeoutMs?: number;
  quietWindowMs?: number;
  minTextLength?: number;
};

function findContentNode(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("#js_content") ??
    document.querySelector<HTMLElement>("#img-content") ??
    document.querySelector<HTMLElement>("article")
  );
}

export async function waitForStableContent(options: WaitOptions = {}): Promise<HTMLElement> {
  const timeoutMs = options.timeoutMs ?? 12000;
  const quietWindowMs = options.quietWindowMs ?? 800;
  const minTextLength = options.minTextLength ?? 20;

  const start = Date.now();

  return new Promise<HTMLElement>((resolve, reject) => {
    let observer: MutationObserver | undefined;
    let quietTimer: number | undefined;

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
      }
      if (quietTimer) {
        window.clearTimeout(quietTimer);
      }
    };

    const evaluate = () => {
      const container = findContentNode();
      if (!container) {
        return false;
      }

      const textLength = (container.textContent ?? "").trim().length;
      if (textLength < minTextLength) {
        return false;
      }

      return true;
    };

    const markQuietAndResolve = () => {
      if (!evaluate()) {
        return;
      }
      cleanup();
      const container = findContentNode();
      if (!container) {
        reject(new Error("正文节点不存在"));
        return;
      }
      resolve(container);
    };

    const scheduleQuietCheck = () => {
      if (quietTimer) {
        window.clearTimeout(quietTimer);
      }
      quietTimer = window.setTimeout(markQuietAndResolve, quietWindowMs);
    };

    const tick = () => {
      if (Date.now() - start > timeoutMs) {
        cleanup();
        reject(new Error("正文加载超时或不稳定"));
        return;
      }

      const container = findContentNode();
      if (container) {
        observer = new MutationObserver(() => {
          scheduleQuietCheck();
        });
        observer.observe(container, {
          childList: true,
          subtree: true,
          characterData: true
        });
        scheduleQuietCheck();
        return;
      }

      window.setTimeout(tick, 250);
    };

    tick();
  });
}
