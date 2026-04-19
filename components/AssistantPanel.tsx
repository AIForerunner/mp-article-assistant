import type { BackendConfig, PageStatus, WeixinArticle } from "../types"

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
  onCopyMarkdown: () => void
  onBackendConfigChange: (next: BackendConfig) => void
  onAutoExtractChange: (next: boolean) => void
}

function renderExtractStatus(status: PageStatus): string {
  if (status.extractStatus === "extracting") return "提取中"
  if (status.extractStatus === "success") return "已提取"
  if (status.extractStatus === "failed") return "提取失败"
  return "待提取"
}

function renderSendStatus(status: PageStatus): string {
  if (status.sendStatus === "sending") return "发送中"
  if (status.sendStatus === "success") return "已发送"
  if (status.sendStatus === "failed") return "发送失败"
  return "未发送"
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
    onCopyMarkdown,
    onBackendConfigChange,
    autoExtractOnStable,
    onAutoExtractChange
  } = props

  const article = pageStatus.article

  const copyStatusText =
    copyStatus === "copying"
      ? "复制中"
      : copyStatus === "success"
        ? "已复制"
        : copyStatus === "failed"
          ? "复制失败"
          : "待复制"

  return (
    <div className={`wxa-panel ${collapsed ? "is-collapsed" : ""}`} data-testid="assistant-panel-root">
      <button className="wxa-collapse" onClick={onToggleCollapsed} data-testid="panel-toggle-btn">
        {collapsed ? "展开" : "收起"}
      </button>

      {!collapsed && (
        <div className="wxa-body">
          <section className="wxa-section">
            <h3>页面状态</h3>
            <div className="wxa-status" data-testid="page-detect-status">
              页面识别: {pageStatus.isWeixinArticlePage ? "公众号文章" : "非目标页面"}
            </div>
            <div className="wxa-status" data-testid="extract-status">
              提取状态: {renderExtractStatus(pageStatus)}
            </div>
            <div className="wxa-status" data-testid="send-status">
              发送状态: {renderSendStatus(pageStatus)}
            </div>
            <div
              className={`wxa-status ${copyStatus === "success" ? "is-success" : copyStatus === "failed" ? "is-error" : ""}`}
              data-testid="copy-status">
              复制状态: {copyStatusText}{copyMessage ? `（${copyMessage}）` : ""}
            </div>
            <div className="wxa-status" data-testid="extract-time-status">
              提取时间: {pageStatus.lastExtractedAt || "-"}
            </div>
            <div className="wxa-status is-error" data-testid="error-status">
              错误: {pageStatus.lastError || "-"}
            </div>
          </section>

          <section className="wxa-section">
            <h3>操作</h3>
            <div className="wxa-actions">
              <button onClick={onExtract} data-testid="extract-article-btn">
                提取文章
              </button>
              <button onClick={onReExtract} data-testid="reextract-article-btn">
                重新提取
              </button>
              <button
                onClick={onSend}
                data-testid="send-backend-btn"
                disabled={!article || pageStatus.sendStatus === "sending"}>
                发送后端
              </button>
              <button
                onClick={onCopyMarkdown}
                data-testid="copy-markdown-btn"
                disabled={!article?.markdown || copyStatus === "copying"}>
                {copyStatus === "copying" ? "复制中..." : copyStatus === "success" ? "已复制" : "复制 Markdown"}
              </button>
            </div>
          </section>

          <section className="wxa-section">
            <h3>后端配置</h3>
            <label>
              Request URL
              <input
                data-testid="backend-url-input"
                value={backendConfig.apiBaseUrl}
                placeholder="https://api.coze.cn/v1/workflow/stream_run"
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
                data-testid="backend-token-input"
                value={backendConfig.apiToken || ""}
                placeholder="Bearer token（不含 Bearer 前缀）"
                onChange={(event) =>
                  onBackendConfigChange({
                    ...backendConfig,
                    apiToken: event.currentTarget.value
                  })
                }
              />
            </label>
            <label>
              Request Method
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
              Custom Headers JSON
              <textarea
                data-testid="backend-headers-input"
                value={backendConfig.customHeadersJson || ""}
                placeholder={'{"Authorization":"Bearer xxx","Content-Type":"application/json"}'}
                onChange={(event) =>
                  onBackendConfigChange({
                    ...backendConfig,
                    customHeadersJson: event.currentTarget.value
                  })
                }
              />
            </label>
            <label>
              Request Body Template JSON
              <textarea
                data-testid="backend-body-template-input"
                value={backendConfig.requestBodyTemplate || ""}
                placeholder={JSON.stringify(
                  {
                    workflow_id: "",
                    app_id: "",
                    parameters: {
                      url: "{{url}}",
                      title: "{{title}}",
                      content: "{{content}}",
                      account: "{{account}}",
                      follow_avatar: "{{follow_avatar}}",
                      create_time: "{{create_time}}"
                    }
                  },
                  null,
                  2
                )}
                onChange={(event) =>
                  onBackendConfigChange({
                    ...backendConfig,
                    requestBodyTemplate: event.currentTarget.value
                  })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                data-testid="auto-extract-checkbox"
                checked={autoExtractOnStable}
                onChange={(event) => onAutoExtractChange(event.currentTarget.checked)}
              />
              正文稳定后自动提取
            </label>
          </section>
        </div>
      )}
    </div>
  )
}
