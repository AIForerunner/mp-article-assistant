import { parseArgs } from "./args";
import { generateFixtureFromCapture } from "./utils/fixture";

async function main(): Promise<void> {
  const args = parseArgs();
  const id = args.ids[0];
  const name = args.fixtureName;

  if (!id || !name) {
    throw new Error("Usage: pnpm samples:fixture -- --id sample-001 --name code-heavy");
  }

  await generateFixtureFromCapture({
    sampleId: id,
    name,
    captureRoot: args.captureRoot,
    fixtureRoot: args.fixtureRoot
  });

  console.log(`Generated fixture ${name} from ${id}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
