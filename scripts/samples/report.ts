import { parseArgs } from "./args";
import { readSamplesOrThrow } from "./jsonl";
import { generateBatchReport } from "./utils/report";
import { readRunManifest } from "./utils/storage";

async function main(): Promise<void> {
  const args = parseArgs();
  const samples = await readSamplesOrThrow(args.input);
  const manifest = args.scope === "run" ? await readRunManifest(args.reportRoot) : undefined;

  if (args.scope === "run" && !manifest) {
    throw new Error("No latest run manifest found. Use --scope all to summarize every existing capture.");
  }

  const { summary } = await generateBatchReport({
    captureRoot: args.captureRoot,
    reportRoot: args.reportRoot,
    samples,
    scope: args.scope,
    manifest
  });

  console.log(
    `Generated sample report: total=${summary.total}, passed=${summary.passed}, warning=${summary.warning}, failed=${summary.failed}, blocked=${summary.blocked}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
