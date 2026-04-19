import { useState } from "react"
import type { WeixinArticle } from "../types"

type MetadataOutlinePanelProps = {
  article?: WeixinArticle
  collapsed: boolean
  onToggleCollapsed: () => void
  onOutlineClick: (anchor: string) => void
}

function MetaSection({ article }: { article?: WeixinArticle }) {
  const [showMore, setShowMore] = useState(false)

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

      <button
        className="wxa-meta-more-btn"
        data-testid="meta-more-toggle"
        onClick={() => setShowMore((prev) => !prev)}>
        {showMore ? "收起链接信息" : "更多"}
      </button>

      {showMore && (
        <>
          <div className="wxa-meta-item">
            <span>文章链接</span>
          </div>
          <div className="wxa-meta-url" data-testid="article-url-link">
            {article.url}
          </div>

          <div className="wxa-meta-item">
            <span>公众号头像链接</span>
          </div>
          <div className="wxa-meta-url" data-testid="account-avatar-url">
            {article.accountAvatar || "-"}
          </div>

          <div className="wxa-meta-item">
            <span>头图链接</span>
          </div>
          <div className="wxa-meta-url" data-testid="cover-image-url">
            {article.coverImage || "-"}
          </div>
        </>
      )}
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
