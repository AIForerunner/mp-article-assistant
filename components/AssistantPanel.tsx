import { useMemo, useState } from "react"
import { UI_COPY } from "../constants/uiCopy"
import { AI_TEMPLATES, buildExtractionQualitySummary, type AiTemplateId } from "../lib"
import type { BackendConfig, PageStatus, WeixinArticle } from "../types"

type PreviewTab = "markdown" | "outline" | "metadata"

type AssistantPanelProps = {
  pageStatus: PageStatus
  backendConfig: BackendConfig
  autoExtractOnStable: boolean
  selectedAiTemplateId: AiTemplateId
  copyStatus: "idle" | "copying" | "success" | "failed"
  copyMessage?: string
  collapsed: boolean
  onToggleCollapsed: () => void
  onExtract: () => void
  onReExtract: () => void
  onSend: () => void
  onCopyAgentContext: (additionalRequirement?: string) => void
  onAiTemplateChange: (next: AiTemplateId) => void
  onCopyMarkdown: () => void
  onDownloadMarkdown: () => void
  onDownloadJson: () => void
  onApplyBackendPreset: () => void
  onBackendConfigChange: (next: BackendConfig) => void
  onAutoExtractChange: (next: boolean) => void
  onOutlineClick: (anchor: string) => void
}

function renderPageStatus(status: PageStatus, autoExtractOnStable: boolean): string {
  if (!status.isWeixinArticlePage) return UI_COPY.status.unsupported
  if (status.extractStatus === "extracting") return UI_COPY.status.extracting
  if (status.extractStatus === "success") return UI_COPY.status.success
  if (status.extractStatus === "failed") return UI_COPY.status.failed
  return autoExtractOnStable ? UI_COPY.status.waitingStable : UI_COPY.status.idle
}

function renderCollapsedText(status: PageStatus): string {
  if (!status.isWeixinArticlePage) return UI_COPY.status.unsupported
  if (status.extractStatus === "extracting") return UI_COPY.collapsed.extracting
  if (status.extractStatus === "success") return UI_COPY.collapsed.success
  if (status.extractStatus === "failed") return UI_COPY.collapsed.failed
  return UI_COPY.collapsed.idle
}

function statusTone(status: PageStatus): string {
  if (!status.isWeixinArticlePage || status.extractStatus === "failed") return "is-error"
  if (status.extractStatus === "success") return "is-success"
  if (status.extractStatus === "extracting") return "is-working"
  return "is-idle"
}

function sendStatusText(status: PageStatus): string {
  if (status.sendStatus === "sending") return UI_COPY.sendStatus.sending
  if (status.sendStatus === "success") return UI_COPY.sendStatus.success
  if (status.sendStatus === "failed") return UI_COPY.sendStatus.failed
  return UI_COPY.sendStatus.idle
}

function getCopyToAiHelpText(templateId: AiTemplateId, additionalRequirement: string): string {
  if (templateId !== "context-only") {
    return UI_COPY.helpers.copyForAiWithAnalysis
  }

  return additionalRequirement.trim()
    ? UI_COPY.helpers.copyForAiContextWithRequirement
    : UI_COPY.helpers.copyForAiContextOnly
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
      <div>{UI_COPY.empty.noArticle}</div>
      <button className="wxa-secondary-btn" onClick={onExtract} data-testid="extract-article-btn">
        {UI_COPY.actions.extractArticle}
      </button>
    </div>
  )
}

function ExtractionQualityCard({ article }: { article?: WeixinArticle }) {
  const [expanded, setExpanded] = useState(false)
  const quality = buildExtractionQualitySummary(article?.extraction)
  const visibleWarnings = expanded ? quality.warnings : quality.warnings.slice(0, 1)

  return (
    <div className={`wxa-quality is-${quality.level}`} data-testid="extraction-quality">
      <div className="wxa-quality-header">
        <span>{UI_COPY.quality.label}</span>
        <strong>{quality.label}</strong>
        <span>
          {UI_COPY.quality.confidence} {quality.confidenceText}
        </span>
      </div>
      <div className="wxa-quality-summary" data-testid="extraction-quality-summary">
        {quality.summary}
      </div>
      {visibleWarnings.length > 0 && (
        <ul className="wxa-quality-warnings" data-testid="extraction-warning-list">
          {visibleWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {quality.warnings.length > 1 && (
        <button className="wxa-quality-toggle" onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? UI_COPY.quality.collapseWarnings : UI_COPY.quality.expandWarnings}
        </button>
      )}
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
          <div className="wxa-empty">{UI_COPY.empty.noHeadings}</div>
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
      {article.markdown || article.contentText || UI_COPY.empty.noMarkdown}
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
    selectedAiTemplateId,
    onToggleCollapsed,
    onExtract,
    onReExtract,
    onSend,
    onCopyAgentContext,
    onAiTemplateChange,
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
  const [additionalRequirement, setAdditionalRequirement] = useState("")
  const article = pageStatus.article
  const hasEndpoint = Boolean(backendConfig.apiBaseUrl?.trim())
  const canUseArticle = Boolean(article)
  const isCopying = copyStatus === "copying"
  const statusLabel = renderPageStatus(pageStatus, autoExtractOnStable)
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
          <span>{renderCollapsedText(pageStatus)}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="wxa-root" data-testid="assistant-panel-root">
      <aside className="wxa-drawer" aria-label={UI_COPY.drawerLabel}>
        <header className="wxa-header">
          <div>
            <h2>{UI_COPY.productName}</h2>
            <div className="wxa-header-status">
              <span className={`wxa-status-dot ${statusClass}`} />
              <span data-testid="page-detect-status">{statusLabel}</span>
            </div>
          </div>
          <div className="wxa-header-actions">
            <button className="wxa-icon-btn" onClick={article ? onReExtract : onExtract} data-testid="reextract-article-btn">
              {UI_COPY.actions.refresh}
            </button>
            <button className="wxa-icon-btn" onClick={onToggleCollapsed} data-testid="panel-toggle-btn">
              {UI_COPY.actions.collapse}
            </button>
          </div>
        </header>

        <div className="wxa-scroll">
          <section className="wxa-section wxa-summary-section">
            <div className="wxa-summary-title">{article?.title || UI_COPY.summary.noArticle}</div>
            <div className="wxa-summary-meta">
              <span>{article?.accountName || UI_COPY.summary.accountUnknown}</span>
              <span>{article?.publishTime || UI_COPY.summary.publishTimeUnknown}</span>
            </div>
            <div className="wxa-stat-grid">
              <div>
                <span>{UI_COPY.summary.stats.text}</span>
                <strong>{formatStat(stats.text)}</strong>
              </div>
              <div>
                <span>{UI_COPY.summary.stats.images}</span>
                <strong>{formatStat(stats.images)}</strong>
              </div>
              <div>
                <span>{UI_COPY.summary.stats.links}</span>
                <strong>{formatStat(stats.links)}</strong>
              </div>
              <div>
                <span>{UI_COPY.summary.stats.code}</span>
                <strong>{formatStat(stats.code)}</strong>
              </div>
            </div>
            {article && <ExtractionQualityCard article={article} />}
            <p className="wxa-privacy-copy">
              {UI_COPY.summary.privacy}
            </p>
          </section>

          <section className="wxa-section">
            <div className="wxa-section-heading">
              <h3>{UI_COPY.sections.aiTemplate}</h3>
              <span data-testid="copy-status">
                {isCopying
                  ? UI_COPY.copy.copying
                  : copyStatus === "success"
                    ? copyMessage || UI_COPY.copy.success
                    : copyStatus === "failed"
                      ? copyMessage || UI_COPY.copy.failed
                      : copyMessage || UI_COPY.copy.idle}
              </span>
            </div>
            <label className="wxa-template-select">
              <span>{UI_COPY.sections.template}</span>
              <select
                value={selectedAiTemplateId}
                disabled={!canUseArticle || isCopying}
                data-testid="ai-template-select"
                onChange={(event) => onAiTemplateChange(event.currentTarget.value as AiTemplateId)}>
                {AI_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="wxa-template-description" data-testid="ai-template-description">
              {AI_TEMPLATES.find((template) => template.id === selectedAiTemplateId)?.description}
            </div>
            <label className="wxa-requirement-input">
              <span>{UI_COPY.additionalRequirement.label}</span>
              <textarea
                value={additionalRequirement}
                placeholder={UI_COPY.additionalRequirement.placeholder}
                disabled={isCopying}
                data-testid="additional-requirement-input"
                onChange={(event) => setAdditionalRequirement(event.currentTarget.value)}
              />
              <small>{UI_COPY.additionalRequirement.help}</small>
            </label>
            <p className="wxa-help-text">{getCopyToAiHelpText(selectedAiTemplateId, additionalRequirement)}</p>
            <button
              className="wxa-primary-action"
              onClick={() => onCopyAgentContext(additionalRequirement)}
              disabled={!canUseArticle || isCopying}
              data-testid="copy-agent-context-btn">
              {UI_COPY.actions.copyForAi}
            </button>

            <div className="wxa-document-actions">
              <div className="wxa-inline-heading">{UI_COPY.sections.articleDocument}</div>
              <p className="wxa-help-text">{UI_COPY.helpers.copyMarkdown}</p>
              <div className="wxa-actions is-secondary">
                <button onClick={onCopyMarkdown} disabled={!canUseArticle || isCopying} data-testid="copy-markdown-btn">
                  {UI_COPY.actions.copyMarkdown}
                </button>
                <button onClick={onDownloadMarkdown} disabled={!canUseArticle} data-testid="download-markdown-btn">
                  {UI_COPY.actions.downloadMarkdown}
                </button>
                <button onClick={onDownloadJson} disabled={!canUseArticle} data-testid="download-json-btn">
                  {UI_COPY.actions.downloadJson}
                </button>
              </div>
            </div>
            {pageStatus.lastError && (
              <div className="wxa-inline-error" data-testid="error-status">
                {pageStatus.lastError}
              </div>
            )}
            <div className="wxa-small-status" data-testid="extract-status">
              {UI_COPY.statusLine.extraction}: {statusLabel}
              {pageStatus.lastExtractedAt ? ` · ${UI_COPY.statusLine.extractedAt}: ${pageStatus.lastExtractedAt}` : ""}
            </div>
          </section>

          <section className="wxa-section">
            <div className="wxa-tabs" role="tablist" aria-label={UI_COPY.sections.preview}>
              {(["markdown", "outline", "metadata"] as const).map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? "is-active" : ""}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  aria-selected={activeTab === tab}
                  data-testid={`preview-tab-${tab}`}>
                  {UI_COPY.tabs[tab]}
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
              <span>{UI_COPY.actions.advancedSettings}</span>
              <span>{advancedOpen ? UI_COPY.advanced.hide : UI_COPY.advanced.show}</span>
            </button>

            {advancedOpen && (
              <div className="wxa-advanced">
                <div className="wxa-config-toolbar">
                  <button className="wxa-secondary-btn" onClick={onApplyBackendPreset} data-testid="coze-preset-btn">
                    {UI_COPY.actions.useCozePreset}
                  </button>
                </div>
                <label>
                  {UI_COPY.advanced.endpointUrl}
                  <input
                    data-testid="backend-url-input"
                    value={backendConfig.apiBaseUrl}
                    placeholder={UI_COPY.advanced.endpointPlaceholder}
                    onChange={(event) =>
                      onBackendConfigChange({
                        ...backendConfig,
                        apiBaseUrl: event.currentTarget.value
                      })
                    }
                  />
                </label>
                <label>
                  {UI_COPY.advanced.apiToken}
                  <input
                    type="password"
                    data-testid="backend-token-input"
                    value={backendConfig.apiToken || ""}
                    placeholder={UI_COPY.advanced.tokenPlaceholder}
                    onChange={(event) =>
                      onBackendConfigChange({
                        ...backendConfig,
                        apiToken: event.currentTarget.value
                      })
                    }
                  />
                </label>
                <label>
                  {UI_COPY.advanced.method}
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
                  {UI_COPY.advanced.headersJson}
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
                  {UI_COPY.advanced.bodyTemplateJson}
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
                  {UI_COPY.advanced.autoExtract}
                </label>
                <div className="wxa-custom-endpoint">
                  <p className="wxa-help-text">{UI_COPY.helpers.customEndpoint}</p>
                  <button
                    className="wxa-secondary-btn wxa-send-btn"
                    onClick={onSend}
                    disabled={!canUseArticle || !hasEndpoint || pageStatus.sendStatus === "sending"}
                    data-testid="send-backend-btn">
                    {UI_COPY.actions.sendWorkflow}
                  </button>
                  <div className="wxa-small-status" data-testid="send-status">
                    {UI_COPY.statusLine.workflow}: {sendStatusText(pageStatus)}
                  </div>
                  {pageStatus.sendStatus === "failed" && pageStatus.lastError && (
                    <div className="wxa-inline-error" data-testid="send-error-status">
                      {pageStatus.lastError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
