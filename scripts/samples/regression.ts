import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "./args";
import { extractArticleFromSnapshot } from "./utils/extract";
import { assertArticleAgainstExpected, loadFixtureExpected } from "./utils/fixture";

async function main(): Promise<void> {
  const args = parseArgs();
  const root = args.fixtureRoot;

  if (!existsSync(root)) {
    console.log("No sample fixtures found.");
    return;
  }

  const entries = await readdir(root, { withFileTypes: true });
  const fixtureNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const failures: string[] = [];

  for (const fixtureName of fixtureNames) {
    const fixtureDir = join(root, fixtureName);
    const inputPath = join(fixtureDir, "input.html");
    const expectedPath = join(fixtureDir, "expected.json");
    if (!existsSync(inputPath) || !existsSync(expectedPath)) {
      failures.push(`${fixtureName}: missing input.html or expected.json`);
      continue;
    }

    const pageHtml = await readFile(inputPath, "utf8");
    const expected = await loadFixtureExpected(expectedPath);
    const article = extractArticleFromSnapshot({
      url: `https://mp.weixin.qq.com/s/${fixtureName}`,
      pageHtml
    });
    const errors = assertArticleAgainstExpected(article, expected);
    errors.forEach((error) => failures.push(`${fixtureName}: ${error}`));
  }

  if (failures.length > 0) {
    console.error(["Sample regression failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(`Sample regression passed (${fixtureNames.length} fixture${fixtureNames.length === 1 ? "" : "s"}).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
