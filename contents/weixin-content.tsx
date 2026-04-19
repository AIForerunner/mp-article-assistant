import cssText from "data-text:../styles/panel.css"
import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { AssistantPanel } from "../components/AssistantPanel"
import { MetadataOutlinePanel } from "../components/MetadataOutlinePanel"
import { detectWeixinArticlePage, extractWeixinArticle, scrollToAnchor } from "../lib"
import { getPageState, setPageState } from "../storage"
import type {
  BackendConfig,
  BackgroundMessage,
  MessageResponse,
  PageStatus,
  UserPreference,
  WeixinArticle
} from "../types"

export const config: PlasmoCSConfig = {
  matches: ["https://mp.weixin.qq.com/s/*", "https://mp.weixin.qq.com/s?*"],
  run_at: "document_idle"
}

const ROOT_ID = "wechat-article-assistant-root"

function createHost(): ShadowRoot {
  let host = document.getElementById(ROOT_ID)
  if (!host) {
    host = document.createElement("div")
    host.id = ROOT_ID
    document.documentElement.appendChild(host)
  }

  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" })

  if (!shadow.querySelector("style[data-wxa-style='1']")) {
    const style = document.createElement("style")
    style.setAttribute("data-wxa-style", "1")
    style.textContent = cssText
    shadow.appendChild(style)
  }

  return shadow
}

async function sendMessage<TData = unknown>(message: BackgroundMessage): Promise<MessageResponse<TData>> {
  const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<TData>
  return response
}

function App() {
  const isWeixinPage = useMemo(() => detectWeixinArticlePage(window.location.href), [])

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [backendConfig, setBackendConfig] = useState<BackendConfig>({ apiBaseUrl: "" })
  const [preference, setPreference] = useState<UserPreference>({ autoExtractOnStable: true })
  const [pageStatus, setPageStatusLocal] = useState<PageStatus>({
    isWeixinArticlePage: isWeixinPage,
    extractStatus: "idle",
    sendStatus: "idle"
  })
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "success" | "failed">("idle")
  const [copyMessage, setCopyMessage] = useState<string>("")
  const copyResetTimerRef = useRef<number | null>(null)
  const pageStatusRef = useRef<PageStatus>(pageStatus)

  useEffect(() => {
    pageStatusRef.current = pageStatus
  }, [pageStatus])

  const updatePageStatus = (patch: Partial<PageStatus>) => {
    setPageStatusLocal((prev) => ({ ...prev, ...patch }))
  }

  const persistCurrentPageState = async (nextState: PageStatus) => {
    await setPageState(window.location.href, {
      extractStatus: nextState.extractStatus,
      sendStatus: nextState.sendStatus,
      lastError: nextState.lastError,
      lastExtractedAt: nextState.lastExtractedAt,
      article: nextState.article
    })
  }

  const handleExtract = async () => {
    setPageStatusLocal((prev) => {
      const next = { ...prev, extractStatus: "extracting" as const, lastError: undefined }
      pageStatusRef.current = next
      return next
    })

    try {
      const article = await extractWeixinArticle(window.location.href)
      const current = pageStatusRef.current
      const nextState: PageStatus = {
        ...current,
        isWeixinArticlePage: isWeixinPage,
        extractStatus: "success",
        sendStatus: current.sendStatus,
        article,
        lastExtractedAt: article.extractedAt,
        lastError: undefined
      }
      setPageStatusLocal(nextState)
      pageStatusRef.current = nextState
      await persistCurrentPageState(nextState)
    } catch (error) {
      const message = error instanceof Error ? error.message : "提取失败"
      const current = pageStatusRef.current
      const nextState: PageStatus = {
        ...current,
        isWeixinArticlePage: isWeixinPage,
        extractStatus: "failed",
        sendStatus: current.sendStatus,
        lastError: message
      }
      setPageStatusLocal(nextState)
      pageStatusRef.current = nextState
      await persistCurrentPageState(nextState)
    }
  }

  const handleReExtract = async () => {
    setPageStatusLocal((prev) => {
      const next = {
        ...prev,
        extractStatus: "extracting" as const,
        sendStatus: "idle" as const,
        lastError: undefined,
        article: undefined
      }
      pageStatusRef.current = next
      return next
    })

    try {
      const article = await extractWeixinArticle(window.location.href)
      const current = pageStatusRef.current
      const nextState: PageStatus = {
        ...current,
        isWeixinArticlePage: isWeixinPage,
        extractStatus: "success",
        sendStatus: "idle",
        article,
        lastExtractedAt: article.extractedAt,
        lastError: undefined
      }
      setPageStatusLocal(nextState)
      pageStatusRef.current = nextState
      await persistCurrentPageState(nextState)
    } catch (error) {
      const message = error instanceof Error ? error.message : "重新提取失败"
      const current = pageStatusRef.current
      const nextState: PageStatus = {
        ...current,
        isWeixinArticlePage: isWeixinPage,
        extractStatus: "failed",
        sendStatus: current.sendStatus,
        lastError: message
      }
      setPageStatusLocal(nextState)
      pageStatusRef.current = nextState
      await persistCurrentPageState(nextState)
    }
  }

  const handleSend = async () => {
    const article: WeixinArticle | undefined = pageStatusRef.current.article
    if (!article) {
      updatePageStatus({ lastError: "请先提取文章" })
      return
    }

    setPageStatusLocal((prev) => {
      const next = { ...prev, sendStatus: "sending" as const, lastError: undefined }
      pageStatusRef.current = next
      return next
    })

    const response = await sendMessage({
      scope: "weixin-article-assistant",
      action: "SEND_ARTICLE",
      payload: { article }
    })

    const current = pageStatusRef.current
    const nextState: PageStatus = {
      ...current,
      isWeixinArticlePage: isWeixinPage,
      sendStatus: response.ok ? "success" : "failed",
      lastError: response.ok ? undefined : response.error || "发送失败"
    }
    setPageStatusLocal(nextState)
    pageStatusRef.current = nextState
    await persistCurrentPageState(nextState)
  }

  const handleCopyMarkdown = async () => {
    const article = pageStatus.article
    const markdown = article?.markdown
    if (!markdown) {
      setCopyStatus("failed")
      setCopyMessage("无可复制内容")
      updatePageStatus({ lastError: "没有可复制的 Markdown" })
      return
    }

    const metadataSection = [
      `标题: ${article.title || ""}`,
      `作者: ${article.author || "-"}`,
      `公众号: ${article.accountName || "-"}`,
      `发布时间: ${article.publishTime || "-"}`,
      `原文链接: ${article.url}`,
      `提取时间: ${article.extractedAt || ""}`
    ].join("\n")

    const fullMarkdown = `${metadataSection}\n\n___\n\n${markdown}`

    try {
      setCopyStatus("copying")
      setCopyMessage("")
      await navigator.clipboard.writeText(fullMarkdown)
      setCopyStatus("success")
      setCopyMessage("已写入剪贴板")
      updatePageStatus({ lastError: undefined })

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current)
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopyStatus("idle")
        setCopyMessage("")
      }, 2500)
    } catch (error) {
      setCopyStatus("failed")
      setCopyMessage("请检查剪贴板权限")
      updatePageStatus({
        lastError: error instanceof Error ? error.message : "复制失败"
      })

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current)
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopyStatus("idle")
        setCopyMessage("")
      }, 3500)
    }
  }

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const [configRes, prefRes, persisted] = await Promise.all([
        sendMessage<BackendConfig>({
          scope: "weixin-article-assistant",
          action: "GET_BACKEND_CONFIG",
          payload: {}
        }),
        sendMessage<UserPreference>({
          scope: "weixin-article-assistant",
          action: "GET_PREFERENCE",
          payload: {}
        }),
        getPageState(window.location.href)
      ])

      if (configRes.ok && configRes.data) {
        setBackendConfig(configRes.data)
      }

      if (prefRes.ok && prefRes.data) {
        setPreference(prefRes.data)
      }

      if (persisted) {
        setPageStatusLocal((prev) => ({
          ...prev,
          ...persisted,
          isWeixinArticlePage: isWeixinPage
        }))
      }
    })()
  }, [isWeixinPage])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      sendMessage({
        scope: "weixin-article-assistant",
        action: "SET_BACKEND_CONFIG",
        payload: { config: backendConfig }
      })
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [backendConfig])

  useEffect(() => {
    sendMessage({
      scope: "weixin-article-assistant",
      action: "SET_PREFERENCE",
      payload: { preference }
    })
  }, [preference])

  useEffect(() => {
    if (!isWeixinPage) {
      return
    }

    if (preference.autoExtractOnStable && pageStatus.extractStatus === "idle") {
      handleExtract()
    }
  }, [isWeixinPage, preference.autoExtractOnStable, pageStatus.extractStatus])

  return (
    <>
      <MetadataOutlinePanel
        article={pageStatus.article}
        collapsed={leftCollapsed}
        onToggleCollapsed={() => setLeftCollapsed((prev) => !prev)}
        onOutlineClick={(anchor) => scrollToAnchor(anchor)}
      />
      <AssistantPanel
        pageStatus={pageStatus}
        backendConfig={backendConfig}
        autoExtractOnStable={preference.autoExtractOnStable}
        copyStatus={copyStatus}
        copyMessage={copyMessage}
        collapsed={rightCollapsed}
        onToggleCollapsed={() => setRightCollapsed((prev) => !prev)}
        onExtract={handleExtract}
        onReExtract={handleReExtract}
        onSend={handleSend}
        onCopyMarkdown={handleCopyMarkdown}
        onBackendConfigChange={setBackendConfig}
        onAutoExtractChange={(next) =>
          setPreference((prev) => ({
            ...prev,
            autoExtractOnStable: next
          }))
        }
      />
    </>
  )
}

const shadowRoot = createHost()
const appRoot = document.createElement("div")
shadowRoot.appendChild(appRoot)
createRoot(appRoot).render(<App />)
