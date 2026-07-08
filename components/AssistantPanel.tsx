import { useMemo, useState } from "react"
import type { BackendConfig, PageStatus, WeixinArticle } from "../types"

type PreviewTab = "markdown" | "outline" | "metadata"

type AssistantPanelProps = {
  pageStatus: PageStatus
  backendConfig: BackendConfig
  autoExtractOnStable: boolean
  copyStatus: "idle" | "copying" | "success" | "failed"
  copyMessage?: string
  collapsed: boolean
  onToggleCollapsed: () => void
  onExtract: () => void
  onReExtract: () => void
  onSend: () => void
  onCopyAgentContext: () => void
  onCopyMarkdown: () => void
  onDownloadMarkdown: () => void
  onDownloadJson: () => void
  onApplyBackendPreset: () => void
  onBackendConfigChange: (next: BackendConfig) => void
  onAutoExtractChange: (next: boolean) => void
  onOutlineClick: (anchor: string) => void
}

function renderPageStatus(status: PageStatus): string {
  if (!status.isWeixinArticlePage) return "Unsupported page"
  if (status.extractStatus === "extracting") return "Extracting"
  if (status.extractStatus === "success") return "Extracted"
  if (status.extractStatus === "failed") return "Needs attention"
  return "Ready"
}

function statusTone(status: PageStatus): string {
  if (!status.isWeixinArticlePage || status.extractStatus === "failed") return "is-error"
  if (status.extractStatus === "success") return "is-success"
  if (status.extractStatus === "extracting") return "is-working"
  return "is-idle"
}

function sendStatusText(status: PageStatus): string {
  if (status.sendStatus === "sending") return "Sending"
  if (status.sendStatus === "success") return "Sent"
  if (status.sendStatus === "failed") return "Send failed"
  return "Not sent"
}

function formatStat(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "-"
}

function buildMetadataPreview(article: WeixinArticle) {
  return {
    source: article.source,
    url: article.url,
    urlType: article.urlType,
    title: article.title,
    author: article.author,
    accountName: article.accountName,
    publishTime: article.publishTime,
    accountAvatar: article.accountAvatar,
    coverImage: article.coverImage,
    biz: article.biz,
    mid: article.mid,
    idx: article.idx,
    sn: article.sn,
    stats: article.stats,
    links: article.links,
    codeBlocks: article.codeBlocks,
    extraction: article.extraction,
    extractedAt: article.extractedAt,
    extractorVersion: article.extractorVersion
  }
}

function EmptyState({ onExtract }: { onExtract: () => void }) {
  return (
    <div className="wxa-empty-state">
      <div>No article extracted yet.</div>
      <button className="wxa-secondary-btn" onClick={onExtract} data-testid="extract-article-btn">
        Extract article
      </button>
    </div>
  )
}

function PreviewPane({
  article,
  activeTab,
  onExtract,
  onOutlineClick
}: {
  article?: WeixinArticle
  activeTab: PreviewTab
  onExtract: () => void
  onOutlineClick: (anchor: string) => void
}) {
  if (!article) {
    return <EmptyState onExtract={onExtract} />
  }

  if (activeTab === "outline") {
    return (
      <div className="wxa-outline" data-testid="outline-list">
        {article.outline?.length ? (
          article.outline.map((item) => (
            <button
              key={item.anchor}
              className={`wxa-outline-item level-${item.level}`}
              data-testid={`outline-item-${item.anchor}`}
              onClick={() => onOutlineClick(item.anchor)}>
              {item.text}
            </button>
          ))
        ) : (
          <div className="wxa-empty">No semantic headings found.</div>
        )}
      </div>
    )
  }

  if (activeTab === "metadata") {
    return (
      <pre className="wxa-preview-code" data-testid="metadata-preview">
        {JSON.stringify(buildMetadataPreview(article), null, 2)}
      </pre>
    )
  }

  return (
    <pre className="wxa-preview-code" data-testid="markdown-preview">
      {article.markdown || article.contentText || "No Markdown output."}
    </pre>
  )
}

export function AssistantPanel(props: AssistantPanelProps) {
  const {
    pageStatus,
    backendConfig,
    collapsed,
    copyStatus,
    copyMessage,
    onToggleCollapsed,
    onExtract,
    onReExtract,
    onSend,
    onCopyAgentContext,
    onCopyMarkdown,
    onDownloadMarkdown,
    onDownloadJson,
    onApplyBackendPreset,
    onBackendConfigChange,
    autoExtractOnStable,
    onAutoExtractChange,
    onOutlineClick
  } = props

  const [activeTab, setActiveTab] = useState<PreviewTab>("markdown")
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const article = pageStatus.article
  const hasEndpoint = Boolean(backendConfig.apiBaseUrl?.trim())
  const canUseArticle = Boolean(article)
  const isCopying = copyStatus === "copying"
  const statusLabel = renderPageStatus(pageStatus)
  const statusClass = statusTone(pageStatus)

  const stats = useMemo(
    () => ({
      text: article?.stats?.textLength ?? article?.contentText?.length,
      images: article?.stats?.imageCount ?? article?.images?.length,
      links: article?.stats?.linkCount ?? article?.links?.length,
      code: article?.stats?.codeBlockCount ?? article?.codeBlocks?.length
    }),
    [article]
  )

  if (collapsed) {
    return (
      <div className="wxa-root is-collapsed" data-testid="assistant-panel-root">
        <button className="wxa-launcher" onClick={onToggleCollapsed} data-testid="panel-toggle-btn">
          <span className={`wxa-status-dot ${statusClass}`} />
          <span>MP Article</span>
        </button>
      </div>
    )
  }

  return (
    <div className="wxa-root" data-testid="assistant-panel-root">
      <aside className="wxa-drawer" aria-label="MP Article Assistant drawer">
        <header className="wxa-header">
          <div>
            <h2>MP Article Assistant</h2>
            <div className="wxa-header-status">
              <span className={`wxa-status-dot ${statusClass}`} />
              <span data-testid="page-detect-status">{statusLabel}</span>
              <span className="wxa-send-state">{sendStatusText(pageStatus)}</span>
            </div>
          </div>
          <div className="wxa-header-actions">
            <button className="wxa-icon-btn" onClick={article ? onReExtract : onExtract} data-testid="reextract-article-btn">
              Refresh
            </button>
            <button className="wxa-icon-btn" onClick={onToggleCollapsed} data-testid="panel-toggle-btn">
              Collapse
            </button>
          </div>
        </header>

        <div className="wxa-scroll">
          <section className="wxa-section wxa-summary-section">
            <div className="wxa-summary-title">{article?.title || "No article extracted"}</div>
            <div className="wxa-summary-meta">
              <span>{article?.accountName || "Account unknown"}</span>
              <span>{article?.publishTime || "Publish time unknown"}</span>
            </div>
            <div className="wxa-stat-grid">
              <div>
                <span>Text</span>
                <strong>{formatStat(stats.text)}</strong>
              </div>
              <div>
                <span>Images</span>
                <strong>{formatStat(stats.images)}</strong>
              </div>
              <div>
                <span>Links</span>
                <strong>{formatStat(stats.links)}</strong>
              </div>
              <div>
                <span>Code</span>
                <strong>{formatStat(stats.code)}</strong>
              </div>
            </div>
            <p className="wxa-privacy-copy">
              By default, content stays in your browser. It is only sent when you configure an endpoint and click Send.
            </p>
          </section>

          <section className="wxa-section">
            <div className="wxa-section-heading">
              <h3>Actions</h3>
              <span data-testid="copy-status">
                {isCopying ? "Copying" : copyStatus === "success" ? "Copied" : copyStatus === "failed" ? "Copy failed" : copyMessage || ""}
              </span>
            </div>
            <div className="wxa-actions">
              <button onClick={onCopyAgentContext} disabled={!canUseArticle || isCopying} data-testid="copy-agent-context-btn">
                Copy for AI
              </button>
              <button onClick={onCopyMarkdown} disabled={!canUseArticle || isCopying} data-testid="copy-markdown-btn">
                Copy Markdown
              </button>
              <button onClick={onDownloadMarkdown} disabled={!canUseArticle} data-testid="download-markdown-btn">
                Download Markdown
              </button>
              <button onClick={onDownloadJson} disabled={!canUseArticle} data-testid="download-json-btn">
                Download JSON
              </button>
              <button
                className="wxa-send-btn"
                onClick={onSend}
                disabled={!canUseArticle || !hasEndpoint || pageStatus.sendStatus === "sending"}
                data-testid="send-backend-btn">
                Send to workflow
              </button>
            </div>
            {pageStatus.lastError && (
              <div className="wxa-inline-error" data-testid="error-status">
                {pageStatus.lastError}
              </div>
            )}
            <div className="wxa-small-status" data-testid="extract-status">
              Extraction: {statusLabel}
              {pageStatus.lastExtractedAt ? ` at ${pageStatus.lastExtractedAt}` : ""}
            </div>
            <div className="wxa-small-status" data-testid="send-status">
              Workflow: {sendStatusText(pageStatus)}
            </div>
          </section>

          <section className="wxa-section">
            <div className="wxa-tabs" role="tablist" aria-label="Article preview">
              {(["markdown", "outline", "metadata"] as const).map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? "is-active" : ""}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  aria-selected={activeTab === tab}
                  data-testid={`preview-tab-${tab}`}>
                  {tab === "markdown" ? "Markdown" : tab === "outline" ? "Outline" : "Metadata"}
                </button>
              ))}
            </div>
            <div className="wxa-preview">
              <PreviewPane
                article={article}
                activeTab={activeTab}
                onExtract={onExtract}
                onOutlineClick={onOutlineClick}
              />
            </div>
          </section>

          <section className="wxa-section">
            <button
              className="wxa-advanced-toggle"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              aria-expanded={advancedOpen}
              data-testid="advanced-settings-toggle">
              <span>Advanced settings</span>
              <span>{advancedOpen ? "Hide" : "Show"}</span>
            </button>

            {advancedOpen && (
              <div className="wxa-advanced">
                <div className="wxa-config-toolbar">
                  <button className="wxa-secondary-btn" onClick={onApplyBackendPreset} data-testid="coze-preset-btn">
                    Use Coze preset
                  </button>
                </div>
                <label>
                  Endpoint URL
                  <input
                    data-testid="backend-url-input"
                    value={backendConfig.apiBaseUrl}
                    placeholder="https://example.com/workflow"
                    onChange={(event) =>
                      onBackendConfigChange({
                        ...backendConfig,
                        apiBaseUrl: event.currentTarget.value
                      })
                    }
                  />
                </label>
                <label>
                  API Token
                  <input
                    type="password"
                    data-testid="backend-token-input"
                    value={backendConfig.apiToken || ""}
                    placeholder="Optional bearer token"
                    onChange={(event) =>
                      onBackendConfigChange({
                        ...backendConfig,
                        apiToken: event.currentTarget.value
                      })
                    }
                  />
                </label>
                <label>
                  Method
                  <select
                    data-testid="backend-method-select"
                    value={backendConfig.requestMethod || "POST"}
                    onChange={(event) =>
                      onBackendConfigChange({
                        ...backendConfig,
                        requestMethod: event.currentTarget.value as "POST" | "PUT" | "PATCH"
                      })
                    }>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </label>
                <label>
                  Headers JSON
                  <textarea
                    data-testid="backend-headers-input"
                    value={backendConfig.customHeadersJson || ""}
                    placeholder={'{"Content-Type":"application/json"}'}
                    onChange={(event) =>
                      onBackendConfigChange({
                        ...backendConfig,
                        customHeadersJson: event.currentTarget.value
                      })
                    }
                  />
                </label>
                <label>
                  Body Template JSON
                  <textarea
                    data-testid="backend-body-template-input"
                    value={backendConfig.requestBodyTemplate || ""}
                    placeholder={'{"title":"{{title}}","content":"{{content}}","url":"{{url}}"}'}
                    onChange={(event) =>
                      onBackendConfigChange({
                        ...backendConfig,
                        requestBodyTemplate: event.currentTarget.value
                      })
                    }
                  />
                </label>
                <label className="wxa-checkbox-row">
                  <input
                    type="checkbox"
                    data-testid="auto-extract-checkbox"
                    checked={autoExtractOnStable}
                    onChange={(event) => onAutoExtractChange(event.currentTarget.checked)}
                  />
                  Auto extract when article settles
                </label>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
