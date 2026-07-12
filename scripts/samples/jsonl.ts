import { readFile } from "node:fs/promises";
import type { LiveSample } from "./types";

export type SampleParseIssue = {
  line: number;
  message: string;
};

export type SampleParseResult = {
  samples: LiveSample[];
  errors: SampleParseIssue[];
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function isValidArticleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "mp.weixin.qq.com";
  } catch {
    return false;
  }
}

export function parseSamplesJsonl(input: string): SampleParseResult {
  const samples: LiveSample[] = [];
  const errors: SampleParseIssue[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  input.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let value: Record<string, unknown>;
    try {
      value = JSON.parse(trimmed) as Record<string, unknown>;
    } catch (error) {
      errors.push({ line: lineNumber, message: `Invalid JSON: ${(error as Error).message}` });
      return;
    }

    const id = typeof value.id === "string" ? value.id.trim() : "";
    const url = typeof value.url === "string" ? value.url.trim() : "";
    const account = typeof value.account === "string" ? value.account.trim() : "";
    const title = typeof value.title === "string" ? value.title.trim() : "";

    if (!id) {
      errors.push({ line: lineNumber, message: "Missing sample id." });
      return;
    }
    if (seenIds.has(id)) {
      errors.push({ line: lineNumber, message: `Duplicate sample id: ${id}` });
      return;
    }
    if (!isValidArticleUrl(url)) {
      errors.push({ line: lineNumber, message: `Invalid mp.weixin.qq.com URL for ${id}.` });
      return;
    }
    if (seenUrls.has(url)) {
      errors.push({ line: lineNumber, message: `Duplicate article URL: ${url}` });
      return;
    }
    if (!account) {
      errors.push({ line: lineNumber, message: `Missing account for ${id}.` });
      return;
    }
    if (!title) {
      errors.push({ line: lineNumber, message: `Missing title for ${id}.` });
      return;
    }

    seenIds.add(id);
    seenUrls.add(url);
    samples.push({
      id,
      source_index: typeof value.source_index === "number" ? value.source_index : undefined,
      url,
      account,
      title,
      tags: asStringArray(value.tags),
      selection_reason:
        typeof value.selection_reason === "string" ? value.selection_reason.trim() : undefined
    });
  });

  return { samples, errors };
}

export async function readSamplesOrThrow(filePath: string): Promise<LiveSample[]> {
  const content = await readFile(filePath, "utf8");
  const result = parseSamplesJsonl(content);

  if (result.errors.length > 0) {
    const formatted = result.errors.map((issue) => `line ${issue.line}: ${issue.message}`).join("\n");
    throw new Error(`Invalid sample input ${filePath}:\n${formatted}`);
  }

  return result.samples;
}
