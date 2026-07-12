import { parseArgs } from "./args";
import { readSamplesOrThrow } from "./jsonl";
import { generateBatchReport } from "./utils/report";

async function main(): Promise<void> {
  const args = parseArgs();
  const samples = await readSamplesOrThrow(args.input);
  const { summary } = await generateBatchReport({
    captureRoot: args.captureRoot,
    reportRoot: args.reportRoot,
    samples
  });

  console.log(
    `Generated sample report: total=${summary.total}, passed=${summary.passed}, warning=${summary.warning}, failed=${summary.failed}, blocked=${summary.blocked}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
