export const UI_COPY = {
  productName: "公众号文章助手",
  drawerLabel: "公众号文章助手抽屉",
  status: {
    unsupported: "当前页面不支持",
    idle: "待提取",
    waitingStable: "正在等待正文稳定",
    extracting: "正在提取",
    success: "已提取",
    failed: "提取失败"
  },
  collapsed: {
    idle: "提取公众号文章",
    extracting: "正在提取",
    success: "已提取 · 可复制",
    failed: "提取失败"
  },
  sendStatus: {
    idle: "未发送",
    sending: "发送中",
    success: "已发送",
    failed: "发送失败"
  },
  actions: {
    refresh: "重新提取",
    collapse: "收起",
    copyForAi: "复制到 AI",
    copyMarkdown: "复制文章 Markdown",
    downloadMarkdown: "下载 Markdown",
    downloadJson: "下载 JSON",
    sendWorkflow: "发送到自定义接口",
    advancedSettings: "高级设置",
    extractArticle: "提取文章",
    useCozePreset: "使用 Coze 预设"
  },
  sections: {
    actions: "操作",
    aiTemplate: "AI 分析模板",
    articleDocument: "复制文章文档",
    preview: "内容预览",
    quality: "提取质量",
    template: "分析模板"
  },
  helpers: {
    copyForAiWithAnalysis: "复制文章内容和所选分析要求，可直接粘贴到 AI 对话中。",
    copyForAiContextOnly: "复制结构化文章上下文，可粘贴到 AI 对话后自行提问。",
    copyForAiContextWithRequirement: "复制文章上下文和本次补充要求，可直接粘贴到 AI 对话中。",
    copyMarkdown: "复制文章 Markdown：仅复制整理后的文章文档，适合笔记、归档和知识库。",
    customEndpoint: "将文章发送到你配置的知识库、工作流或自建服务。"
  },
  additionalRequirement: {
    label: "补充要求（可选）",
    placeholder: "例如：重点分析它对研发团队的影响",
    help: "将附加在所选分析要求之后，仅影响本次复制内容。"
  },
  quality: {
    label: "提取质量",
    confidence: "Confidence",
    expandWarnings: "展开提示",
    collapseWarnings: "收起提示"
  },
  summary: {
    noArticle: "当前页面尚未提取文章",
    accountUnknown: "公众号未知",
    publishTimeUnknown: "发布时间未知",
    privacy: "默认情况下，文章内容只保留在当前浏览器中；仅当你配置 Endpoint 并点击发送时，才会发送到自定义接口。",
    stats: {
      text: "文本",
      images: "图片",
      links: "链接",
      code: "代码"
    }
  },
  copy: {
    idle: "",
    copying: "正在复制",
    success: "已复制",
    failed: "复制失败",
    noContext: "暂无可复制的文章上下文",
    contextCopied: "已复制 AI 分析内容",
    noMarkdown: "暂无可复制的 Markdown",
    markdownCopied: "已复制文章 Markdown",
    clipboardFailed: "剪贴板权限不可用"
  },
  empty: {
    noArticle: "当前页面尚未提取文章。",
    noHeadings: "未发现可用目录。",
    noMarkdown: "暂无 Markdown 内容。"
  },
  tabs: {
    markdown: "Markdown",
    outline: "目录",
    metadata: "Metadata"
  },
  statusLine: {
    extraction: "提取状态",
    workflow: "接口发送状态",
    extractedAt: "完成时间"
  },
  advanced: {
    show: "展开",
    hide: "隐藏",
    endpointUrl: "Endpoint URL",
    endpointPlaceholder: "https://example.com/workflow",
    apiToken: "API Token",
    tokenPlaceholder: "可选 Bearer Token",
    method: "Method",
    headersJson: "Headers JSON",
    bodyTemplateJson: "Body Template JSON",
    autoExtract: "正文稳定后自动提取"
  },
  errors: {
    extractBeforeSend: "请先提取文章，再发送到自定义接口。",
    configureEndpoint: "请先在高级设置中配置 Endpoint。",
    copyFailed: "复制失败",
    noArticleDownload: "暂无可下载的文章。",
    extractFailed: "提取失败",
    reExtractFailed: "重新提取失败"
  }
} as const;
