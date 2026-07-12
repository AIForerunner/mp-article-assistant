import type { LiveSample } from "../types";

export type BatchResult<T> = {
  sample: LiveSample;
  ok: boolean;
  value?: T;
  error?: Error;
};

export type BatchOptions = {
  concurrency: number;
  delayMs: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSampleBatch<T>(
  samples: LiveSample[],
  worker: (sample: LiveSample) => Promise<T>,
  options: BatchOptions
): Promise<BatchResult<T>[]> {
  const results: BatchResult<T>[] = [];
  let cursor = 0;
  const concurrency = Math.max(1, Math.min(options.concurrency, samples.length || 1));

  async function runWorker(): Promise<void> {
    while (cursor < samples.length) {
      const sample = samples[cursor];
      cursor += 1;
      try {
        const value = await worker(sample);
        results.push({ sample, ok: true, value });
      } catch (error) {
        results.push({ sample, ok: false, error: error as Error });
      }
      if (options.delayMs > 0 && cursor < samples.length) {
        await sleep(options.delayMs);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
  return results.sort((a, b) => samples.indexOf(a.sample) - samples.indexOf(b.sample));
}
