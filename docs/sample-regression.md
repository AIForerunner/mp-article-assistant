# Live Sample Regression

MP Article Assistant uses two complementary regression paths:

- Static fixtures run on every PR and never access third-party article pages.
- Live samples collect real WeChat Official Account URLs on demand or on a schedule.

The live path exists to find template drift, lazy image changes, metadata breakage, and extraction quality regressions that synthetic fixtures usually miss.

## URL List

Live samples live in `samples/live/articles.jsonl`. Each line is one JSON object:

```json
{
  "id": "sample-001",
  "url": "https://mp.weixin.qq.com/s/xxx",
  "account": "公众号名称",
  "title": "文章标题",
  "tags": ["技术长文"],
  "selection_reason": "为什么选择该样本"
}
```

Keep IDs stable. The collector ignores `source_index`; it uses `id`, `url`, `account`, `title`, and `tags`.

## Run Collection

Install dependencies and Playwright Chromium first:

```bash
pnpm install
pnpm exec playwright install chromium
```

Collect all samples:

```bash
pnpm samples:collect
```

Collect a subset:

```bash
pnpm samples:collect -- --limit 5
pnpm samples:collect -- --id sample-001
```

Use headed mode for local debugging:

```bash
pnpm samples:collect:headed -- --id sample-001
```

The collector defaults to concurrency 2, adds delay between samples, retries transient network failures, and marks login, verification, paid, or blocked pages as `blocked`. It does not bypass access controls.

## Outputs

Each sample writes local diagnostics under `samples/captures/<sample-id>/`:

- `metadata.json`
- `page.html`
- `content.html`
- `extracted.json`
- `output.md`
- `screenshot.png`
- `report.json`

These captures can contain third-party article content and screenshots, so `samples/captures/` is ignored by Git.

## Reports

Generate or refresh the aggregate report:

```bash
pnpm samples:report
```

Reports are written to `samples/reports/latest/`:

- `summary.json`
- `summary.md`
- `failures.json`
- `manifest.json`

By default, collection writes a run manifest and the summary only covers the selected samples from that run. For example, `pnpm samples:collect -- --limit 5` reports only those five samples even if older captures exist locally.

To summarize every existing local capture explicitly:

```bash
pnpm samples:report -- --scope all
```

Rerun only the previous failed or blocked samples:

```bash
pnpm samples:collect:failed
```

`samples/reports/latest/` is ignored because it is generated from local captures.

## Static Fixtures

Do not commit full captured article HTML, Markdown, screenshots, or extracted JSON. Instead, create a minimized public fixture:

```bash
pnpm samples:fixture -- --id sample-001 --name code-heavy
```

The fixture generator removes scripts, iframes, tracking fields, WeChat identity parameters, real body text, real account names, and real image/link URLs while preserving useful DOM structure, classes, styles, and key attributes.

Static fixtures live under `samples/fixtures/<name>/`:

- `input.html`
- `expected.json`

Run the stable regression suite:

```bash
pnpm regression
```

`expected.json` should assert durable behavior with minimums, maximums, contains, and not-contains checks. Avoid full Markdown snapshots.

## Adding A Regression For A New Bug

1. Add or select a representative URL in `samples/live/articles.jsonl`.
2. Run `pnpm samples:collect -- --id <sample-id>`.
3. Inspect `samples/captures/<sample-id>/report.json` and `summary.md`.
4. Generate a sanitized fixture with `pnpm samples:fixture -- --id <sample-id> --name <case-name>`.
5. Tighten `expected.json` to capture the bug without exposing third-party content.
6. Run `pnpm test`, `pnpm regression`, `pnpm build`, and `pnpm package`.

## Repository Boundary

Safe to commit:

- URL list
- collector and report code
- report schema
- aggregate metric examples
- sanitized fixtures
- CI and workflow definitions

Do not commit:

- complete article HTML
- complete article Markdown
- screenshots
- downloaded images
- full extracted article JSON
