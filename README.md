# MP Article Assistant

MP Article Assistant is a Manifest V3 Chrome extension for extracting WeChat Official Account articles into structured Markdown and JSON.

It opens as a small floating pill on `mp.weixin.qq.com` article pages. Expanding the pill shows a right-side drawer with article summary, copy/download actions, preview tabs, and opt-in workflow sending.

By default, content stays in your browser. It is only sent when you configure an endpoint and click Send.

## What It Does

- Extracts WeChat Official Account title, account, publish time, content, images, links, code blocks, outline, stats, and extraction confidence.
- Copies an AI-ready context bundle with metadata, stats, links, code blocks, and Markdown.
- Copies or downloads Markdown.
- Downloads the full structured JSON payload.
- Sends to a configured workflow endpoint only after the user fills in advanced settings and clicks Send.
- Keeps backend config empty by default; Coze Workflow is available as an explicit preset.

## Screenshots

Place Chrome Web Store screenshots and promo images in `docs/screenshots/`.

- `docs/screenshots/drawer-summary.png` - drawer with article summary and actions.
- `docs/screenshots/preview-tabs.png` - Markdown, Outline, and Metadata preview tabs.
- `docs/screenshots/advanced-settings.png` - collapsed and expanded workflow settings.

## Privacy And Permissions

See [docs/privacy.md](docs/privacy.md).

Current extension permissions stay intentionally small:

- `storage` for local settings and per-page extraction state.
- `clipboardWrite` for Copy for AI and Copy Markdown.
- Host access limited to `https://mp.weixin.qq.com/*`.

## Local Development

```bash
pnpm install
pnpm dev
```

Load the generated unpacked extension from Chrome's `chrome://extensions` page. Plasmo usually writes development builds to `build/chrome-mv3-dev`.

## Build And Test

```bash
pnpm test
pnpm build
pnpm package
```

The fixture tests cover short articles, non-semantic heading noise, image URL normalization, link extraction, and code block extraction.

## Workflow Sending

Open Advanced settings in the drawer to configure:

- Endpoint URL
- API Token
- Method
- Headers JSON
- Body Template JSON

Template placeholders include `{{url}}`, `{{title}}`, `{{content}}`, `{{account}}`, `{{follow_avatar}}`, `{{create_time}}`, `{{author}}`, `{{content_text}}`, `{{content_html}}`, `{{biz}}`, `{{mid}}`, `{{idx}}`, `{{sn}}`, and `{{article}}`.

No request is made until Send to workflow is clicked.

## Chrome Store Readiness

Use [docs/chrome-store-checklist.md](docs/chrome-store-checklist.md) before packaging a release.
