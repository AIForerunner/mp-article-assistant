import type { WeixinArticle } from "../types"

type MetadataOutlinePanelProps = {
  article?: WeixinArticle
  collapsed: boolean
  onToggleCollapsed: () => void
  onOutlineClick: (anchor: string) => void
}

function MetaSection({ article }: { article?: WeixinArticle }) {
  if (!article) {
    return <div className="wxa-empty">暂无提取数据</div>
  }

  return (
    <div className="wxa-meta">
      <div className="wxa-meta-item">
        <span>标题</span>
        <strong>{article.title}</strong>
      </div>
      <div className="wxa-meta-item">
        <span>作者</span>
        <strong>{article.author || "-"}</strong>
      </div>
      <div className="wxa-meta-item">
        <span>公众号</span>
        <strong>{article.accountName || "-"}</strong>
      </div>
      <div className="wxa-meta-item">
        <span>发布时间</span>
        <strong>{article.publishTime || "-"}</strong>
      </div>
    </div>
  )
}

export function MetadataOutlinePanel(props: MetadataOutlinePanelProps) {
  const { article, collapsed, onToggleCollapsed, onOutlineClick } = props

  return (
    <div
      className={`wxa-panel wxa-panel-left ${collapsed ? "is-collapsed" : ""}`}
      data-testid="metadata-outline-panel-root">
      <button className="wxa-collapse" onClick={onToggleCollapsed} data-testid="metadata-panel-toggle-btn">
        {collapsed ? "展开" : "收起"}
      </button>

      {!collapsed && (
        <div className="wxa-body">
          <section className="wxa-section">
            <h3>元信息</h3>
            <MetaSection article={article} />
          </section>

          <section className="wxa-section">
            <h3>Outline</h3>
            <div className="wxa-outline" data-testid="outline-list">
              {article?.outline?.length ? (
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
                <div className="wxa-empty">暂无 outline</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
