export type ParsedArgs = {
  ids: string[];
  limit?: number;
  headed: boolean;
  failed: boolean;
  concurrency: number;
  timeoutMs: number;
  retries: number;
  delayMs: number;
  input: string;
  captureRoot: string;
  reportRoot: string;
  fixtureRoot: string;
  fixtureName?: string;
};

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseArgs(argv = process.argv.slice(2)): ParsedArgs {
  const args: ParsedArgs = {
    ids: [],
    headed: false,
    failed: false,
    concurrency: 2,
    timeoutMs: 30_000,
    retries: 2,
    delayMs: 1000,
    input: "samples/live/articles.jsonl",
    captureRoot: "samples/captures",
    reportRoot: "samples/reports/latest",
    fixtureRoot: "samples/fixtures"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case "--":
        break;
      case "--id":
        if (next) {
          args.ids.push(next);
          index += 1;
        }
        break;
      case "--limit":
        args.limit = readNumber(next, args.limit || 0);
        index += 1;
        break;
      case "--headed":
        args.headed = true;
        break;
      case "--headless":
        args.headed = false;
        break;
      case "--failed":
        args.failed = true;
        break;
      case "--concurrency":
        args.concurrency = Math.max(1, readNumber(next, args.concurrency));
        index += 1;
        break;
      case "--timeout-ms":
        args.timeoutMs = readNumber(next, args.timeoutMs);
        index += 1;
        break;
      case "--retries":
        args.retries = Math.max(0, readNumber(next, args.retries));
        index += 1;
        break;
      case "--delay-ms":
        args.delayMs = Math.max(0, readNumber(next, args.delayMs));
        index += 1;
        break;
      case "--input":
        if (next) {
          args.input = next;
          index += 1;
        }
        break;
      case "--capture-root":
        if (next) {
          args.captureRoot = next;
          index += 1;
        }
        break;
      case "--report-root":
        if (next) {
          args.reportRoot = next;
          index += 1;
        }
        break;
      case "--fixture-root":
        if (next) {
          args.fixtureRoot = next;
          index += 1;
        }
        break;
      case "--name":
        if (next) {
          args.fixtureName = next;
          index += 1;
        }
        break;
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  return args;
}
