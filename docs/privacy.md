# Privacy

MP Article Assistant is local-first.

By default, content stays in your browser. It is only sent when you configure an endpoint and click Send.

## Data The Extension Reads

On supported WeChat Official Account article pages, the extension reads page content needed to build Markdown and JSON:

- Article title, account name, author, publish time, and source URL.
- Article body text and cleaned HTML.
- Images, links, code blocks, outline, and extraction stats.

## Data Stored Locally

The extension uses `chrome.storage.local` for:

- Per-page extraction status and the last extracted article payload.
- Advanced workflow settings, including endpoint URL, optional API token, method, headers JSON, and body template JSON.
- User preferences such as automatic extraction after the page settles.

This data is stored in the browser profile where the extension is installed.

## Network Behavior

The extension does not upload article content by default.

Article content is sent only when all of these are true:

- The user opens Advanced settings and configures an endpoint.
- The user has extracted an article.
- The user clicks Send to workflow.

The configured endpoint receives the request body generated from the user's settings. If a token is configured, it is added to the request unless the user supplies an Authorization header manually.

## Third-Party Services

The Coze Workflow configuration is an optional preset. It is not enabled by default.

When the user sends content to any configured endpoint, that endpoint's own privacy and retention practices apply.

## Permissions

- `storage`: saves local settings and extraction state.
- `clipboardWrite`: supports Copy for AI and Copy Markdown.
- `https://mp.weixin.qq.com/*`: allows the content script to run only on WeChat Official Account article pages.

The extension does not request broad host access.
