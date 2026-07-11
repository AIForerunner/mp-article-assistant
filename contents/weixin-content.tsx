import cssAssetUrl from "url:../styles/panel.css"
import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { AssistantPanel } from "../components/AssistantPanel"
import {
  buildAgentContext,
  buildMarkdownDocument,
  COZE_WORKFLOW_PRESET,
  detectWeixinArticlePage,
  downloadJson,
  downloadMarkdown,
  extractWeixinArticle,
  resolveAiTemplateId,
  scrollToAnchor
} from "../lib"
import { UI_COPY } from "../constants/uiCopy"
import { getPageState, setPageState } from "../storage"
import type { AiTemplateId } from "../lib"
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
const STYLE_ASSET_URL = cssAssetUrl

function createHost(): ShadowRoot {
  let host = document.getElementById(ROOT_ID)
  if (!host) {
    host = document.createElement("div")
    host.id = ROOT_ID
    document.documentElement.appendChild(host)
  }

  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" })

  if (!shadow.querySelector("link[data-wxa-style='1']")) {
    const link = document.createElement("link")
    link.setAttribute("data-wxa-style", "1")
    link.rel = "stylesheet"
    link.href = STYLE_ASSET_URL
    shadow.appendChild(link)
  }

  return shadow
}

async function sendMessage<TData = unknown>(message: BackgroundMessage): Promise<MessageResponse<TData>> {
  const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<TData>
  return response
}

function App() {
  const isWeixinPage = useMemo(() => detectWeixinArticlePage(window.location.href), [])

  const [drawerCollapsed, setDrawerCollapsed] = useState(true)
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
  const selectedAiTemplateId: AiTemplateId = resolveAiTemplateId(preference.aiTemplateId)

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
      updatePageStatus({ lastError: UI_COPY.errors.extractBeforeSend })
      return
    }

    if (!backendConfig.apiBaseUrl?.trim()) {
      updatePageStatus({ lastError: UI_COPY.errors.configureEndpoint })
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
      lastError: response.ok ? undefined : response.error || UI_COPY.sendStatus.failed
    }
    setPageStatusLocal(nextState)
    pageStatusRef.current = nextState
    await persistCurrentPageState(nextState)
  }

  const resetCopyStatusLater = (delayMs: number) => {
    if (copyResetTimerRef.current) {
      window.clearTimeout(copyResetTimerRef.current)
    }
    copyResetTimerRef.current = window.setTimeout(() => {
      setCopyStatus("idle")
      setCopyMessage("")
    }, delayMs)
  }

  const copyTextToClipboard = async (text: string | undefined, emptyMessage: string, successMessage: string) => {
    if (!text) {
      setCopyStatus("failed")
      setCopyMessage(emptyMessage)
      updatePageStatus({ lastError: emptyMessage })
      resetCopyStatusLater(3500)
      return
    }

    try {
      setCopyStatus("copying")
      setCopyMessage("")
      await navigator.clipboard.writeText(text)
      setCopyStatus("success")
      setCopyMessage(successMessage)
      updatePageStatus({ lastError: undefined })
      resetCopyStatusLater(2500)
    } catch (error) {
      setCopyStatus("failed")
      setCopyMessage(UI_COPY.copy.clipboardFailed)
      updatePageStatus({
        lastError: error instanceof Error ? error.message : UI_COPY.errors.copyFailed
      })
      resetCopyStatusLater(3500)
    }
  }

  const handleCopyAgentContext = async (additionalRequirement?: string) => {
    const article = pageStatus.article
    await copyTextToClipboard(
      article ? buildAgentContext(article, selectedAiTemplateId, additionalRequirement) : undefined,
      UI_COPY.copy.noContext,
      UI_COPY.copy.contextCopied
    )
  }

  const handleCopyMarkdown = async () => {
    const article = pageStatus.article
    await copyTextToClipboard(
      article ? buildMarkdownDocument(article) : undefined,
      UI_COPY.copy.noMarkdown,
      UI_COPY.copy.markdownCopied
    )
  }

  const handleDownloadMarkdown = () => {
    const article = pageStatusRef.current.article
    if (!article) {
      updatePageStatus({ lastError: UI_COPY.errors.noArticleDownload })
      return
    }
    downloadMarkdown(article)
  }

  const handleDownloadJson = () => {
    const article = pageStatusRef.current.article
    if (!article) {
      updatePageStatus({ lastError: UI_COPY.errors.noArticleDownload })
      return
    }
    downloadJson(article)
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
      <AssistantPanel
        pageStatus={pageStatus}
        backendConfig={backendConfig}
        autoExtractOnStable={preference.autoExtractOnStable}
        selectedAiTemplateId={selectedAiTemplateId}
        copyStatus={copyStatus}
        copyMessage={copyMessage}
        collapsed={drawerCollapsed}
        onToggleCollapsed={() => setDrawerCollapsed((prev) => !prev)}
        onExtract={handleExtract}
        onReExtract={handleReExtract}
        onSend={handleSend}
        onCopyAgentContext={handleCopyAgentContext}
        onAiTemplateChange={(next) =>
          setPreference((prev) => ({
            ...prev,
            aiTemplateId: next
          }))
        }
        onCopyMarkdown={handleCopyMarkdown}
        onDownloadMarkdown={handleDownloadMarkdown}
        onDownloadJson={handleDownloadJson}
        onApplyBackendPreset={() => setBackendConfig(COZE_WORKFLOW_PRESET)}
        onBackendConfigChange={setBackendConfig}
        onAutoExtractChange={(next) =>
          setPreference((prev) => ({
            ...prev,
            autoExtractOnStable: next
          }))
        }
        onOutlineClick={(anchor) => scrollToAnchor(anchor)}
      />
    </>
  )
}

const shadowRoot = createHost()
const appRoot = document.createElement("div")
shadowRoot.appendChild(appRoot)
createRoot(appRoot).render(<App />)
