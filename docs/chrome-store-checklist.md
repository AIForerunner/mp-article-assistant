# Chrome Store Checklist

Use this checklist before publishing a release build.

Official references:

- Chrome Web Store program policies: https://developer.chrome.com/docs/webstore/program-policies
- Permission declaration guidance: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Store listing image guidance: https://developer.chrome.com/docs/webstore/images

## Product Scope

- Single purpose is clear: extract WeChat Official Account articles into structured Markdown and JSON.
- UI opens as a compact pill and expands into one right-side drawer.
- No developer/debug labels remain in the production UI.
- Advanced settings are collapsed by default.
- Local-only privacy copy is visible in the drawer.

## Privacy

- `docs/privacy.md` matches the actual extension behavior.
- No article content is uploaded unless the user configures an endpoint and clicks Send.
- Coze Workflow appears only as an opt-in preset.
- API token handling is disclosed.
- Store privacy practices are filled out consistently with local storage, clipboard usage, and optional user-configured network requests.

## Permissions

- Manifest stays on MV3.
- Required permissions are limited to `storage` and `clipboardWrite`.
- Host permissions stay limited to `https://mp.weixin.qq.com/*`.
- No broad host permissions or remote code execution are introduced.

## Assets

- Extension icon is present and legible at small sizes.
- Screenshots are added under `docs/screenshots/`.
- Screenshots show the real drawer, preview tabs, and advanced settings.
- Promotional images are generated only if needed for the final listing.

## QA

- `pnpm test` passes.
- `pnpm build` passes.
- `pnpm package` creates a Chrome MV3 package.
- Manual test on `https://mp.weixin.qq.com/s/*`.
- Manual test on `https://mp.weixin.qq.com/s?*`.
- Verify Copy for AI, Copy Markdown, Download Markdown, Download JSON, and Send to workflow.
- Verify no send request happens with an empty endpoint.
- Verify configured headers/body template errors are shown clearly.

## Listing Copy

- Name: MP Article Assistant.
- Summary describes WeChat Official Account Markdown/JSON extraction.
- Description mentions local-first behavior and optional workflow sending.
- Support/contact URL is filled in before submission.
- Privacy policy URL points to the published copy of `docs/privacy.md`.

## Release

- Version is bumped in `package.json`.
- Release build is produced from a clean worktree.
- Packaged artifact is reviewed before upload.
- Chrome Web Store submission notes mention the narrow WeChat host permission and local-only default.
