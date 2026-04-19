你是一个资深 Chrome Extension 工程师，请帮我实现一个面向微信公众号文章页面的浏览器扩展。

## 一、项目目标

实现一个基于 **Manifest V3 + Plasmo + React + TypeScript** 的 Chrome 扩展。

这个扩展只服务于微信公众号文章页面 `https://mp.weixin.qq.com/s*`，不是通用网页剪藏工具。

它的目标是做成一个“页面内工作台”：

1. 在公众号文章页面中，自动或手动提取文章内容与元数据
2. 在**页面内部右侧注入一个悬浮侧栏 / 抽屉面板**，作为主 UI
3. 支持以下操作：
   - 提取文章
   - 发送到后端
   - 复制 Markdown
   - 查看文章 outline（主子标题结构）
   - 点击 outline 定位到页面对应位置
4. 所有核心逻辑都要工程化、模块化，便于后续扩展成批量模式

---

## 二、技术选型（必须遵守）

请严格使用以下技术方案：

- Chrome Extension Manifest V3
- Plasmo
- React
- TypeScript
- content script 作为页面注入入口
- background service worker 负责消息、配置、调用后端
- chrome.storage 做配置和状态缓存
- 页面内 UI 使用 React 渲染到注入节点中
- 页面内 UI 建议通过 **Shadow DOM** 隔离样式，避免与公众号页面样式冲突
- 默认使用 pnpm

---

## 三、页面与权限范围

### 仅支持的页面
- `https://mp.weixin.qq.com/s/*`
- `https://mp.weixin.qq.com/s?*`

### host permissions
- 仅允许 `https://mp.weixin.qq.com/*`

### 最小权限原则
当前版本只使用：
- `storage`
- `clipboardWrite`
- host permissions: `https://mp.weixin.qq.com/*`

不要额外申请不必要权限。
当前 v0 版本不要强依赖 `tabs`、`sidePanel` 等能力。

---

## 四、产品形态要求

### 不是浏览器 Side Panel
请不要使用 Chrome Side Panel 作为主 UI。

### 必须改为“页面内右侧悬浮面板 / 抽屉”
即：
- 在公众号文章页面中，通过 content script 注入一个页面内 DOM 宿主节点
- 在页面右侧渲染一个可折叠的扩展面板
- 面板应属于网页 DOM 的一部分，便于 RPA / 自动化工具（例如影刀）直接操作页面按钮和读取状态

### 页面内面板要求
建议实现为：
- 默认右侧固定悬浮
- 支持折叠 / 展开
- 不要严重遮挡正文
- 高 z-index
- 简洁实用，不要花哨
- 宽度建议约 320~380px

---

## 五、核心功能需求

### A. 文章提取
在公众号文章页中，等待正文稳定加载后，提取以下内容：

```ts
type WeixinArticle = {
  source: "weixin_mp"
  url: string
  urlType: "short" | "query" | "unknown"

  biz?: string
  mid?: string
  idx?: string
  sn?: string

  title: string
  author?: string
  accountName?: string
  publishTime?: string

  contentHtml: string
  contentText: string

  outline: Array<{
    level: 1 | 2 | 3
    text: string
    anchor: string
  }>

  images: string[]

  markdown?: string

  extractedAt: string
  extractorVersion: string
}
````

### B. 发送到后端

提取完成后，支持点击按钮将 `WeixinArticle` 发送到后端。

后端配置需可配置，例如：

```ts
type BackendConfig = {
  apiBaseUrl: string
  apiToken?: string
}
```

默认按以下形式调用：

* `POST /api/articles/collect`
* request body 为 `WeixinArticle`

请将 `apiBaseUrl` 和 `apiToken` 放到可配置存储中，不要写死。

### C. 复制 Markdown

支持将整篇文章转成 Markdown，并点击按钮复制到剪贴板。

### D. 展示文章 outline

在页面内面板中展示文章主子标题结构（类似 h1 / h2 / h3）。

但请注意：

* 不要只依赖原始 DOM 中的 h1/h2/h3
* 因为公众号文章很多不是标准语义标题
* 需要增加“样式与文本模式推断”的兜底策略
* outline 中每一项都需要有 anchor
* 点击 outline 项时，要滚动到正文对应位置

### E. 状态展示

页面内面板中应展示：

* 当前页面是否识别为公众号文章
* 是否已提取成功
* 是否已发送后端
* 最近一次错误信息
* 当前提取时间

---

## 六、提取逻辑要求

### 1. 不要页面一加载就立即提取

必须先判断正文是否已稳定。

### 2. 页面稳定判断建议

请实现较稳健的策略，例如：

* 正文节点已存在
* 正文文本长度超过阈值
* DOM 在一小段时间内没有明显变化
* 提取失败时可重试

### 3. 不要只用 innerText

请同时保留：

* 原始/清洗后的 `contentHtml`
* 纯文本 `contentText`

### 4. 图片提取

提取正文中的图片 URL 列表。

### 5. URL 参数解析

请解析 URL 中的：

* `__biz`
* `mid`
* `idx`
* `sn`

### 6. 标题锚点

对正文中的标题段落生成稳定 anchor，用于 outline 导航和滚动定位。

---

## 七、Markdown 生成要求

Markdown 生成必须基于**清洗后的正文 DOM**，而不是简单地拿 `innerText` 拼接。

请尽量保留：

* 标题层级
* 段落
* 列表
* 引用
* 图片
* 加粗等基础结构

输出的 Markdown 应适合：

* 复制传播
* 喂给 LLM
* 作为后端存储的附加字段

---

## 八、页面内注入 UI 要求

### 注入方式

请在页面中插入一个宿主节点，例如：

* `#wechat-article-assistant-root`

并优先使用 Shadow DOM 包裹 UI，避免与原页面样式冲突。

### UI 必须包含

1. 页面状态区

   * 是否为公众号文章
   * 提取状态
   * 发送状态
   * 错误信息

2. 操作区

   * 提取文章
   * 重新提取
   * 发送后端
   * 复制 Markdown

3. 元信息区

   * 标题
   * 作者
   * 公众号名称
   * 发布时间

4. outline 区

   * 展示主子标题结构
   * 点击可滚动定位

### 自动化工具可操作性要求

为了方便影刀等自动化工具接管，所有关键按钮和状态节点都必须有稳定的属性，例如：

```html
<button data-testid="extract-article-btn">提取文章</button>
<button data-testid="send-backend-btn">发送后端</button>
<button data-testid="copy-markdown-btn">复制 Markdown</button>
<div data-testid="extract-status">已提取</div>
```

不要依赖随机 class 名作为自动化控制入口。

---

## 九、架构要求（必须严格遵守）

### content script

负责：

* 页面识别
* 注入页面内 UI
* 等待正文稳定
* 提取 article 数据
* 响应页面内按钮点击
* 通过消息与 background 通信

不负责：

* 复杂持久化
* 后端配置管理
* 直接把所有逻辑堆在一个文件里

### background service worker

负责：

* 接收 content script 的消息
* 调用后端 API
* 保存配置
* 管理发送状态
* 返回后端调用结果

### lib

负责拆分纯逻辑模块，例如：

* `parseWeixinUrlParams`
* `extractArticleMeta`
* `extractArticleContent`
* `buildArticleOutline`
* `convertHtmlToMarkdown`
* `scrollToAnchor`
* `waitForStableContent`

### storage

负责：

* 读取 / 保存后端配置
* 保存最近一次提取状态
* 保存用户偏好（如是否自动提取）

### types

所有共享类型统一放到 `types/` 目录。

---

## 十、项目目录要求

请给出清晰的工程目录结构，建议类似：

* `contents/`

  * `weixin-content.tsx`
* `background/`

  * `index.ts`
* `components/`

  * 页面内面板相关 React 组件
* `lib/`

  * 提取、解析、markdown、outline、dom 清洗等纯逻辑模块
* `storage/`

  * config / state 管理
* `types/`

  * article / message / config 类型
* `styles/`

  * 面板样式（如需要）
* `tests/`

  * 纯函数单测
* `README.md`

---

## 十一、测试要求

至少提供以下纯函数单测：

1. `parseWeixinUrlParams`
2. `buildArticleOutline`
3. `convertHtmlToMarkdown`

如果方便，也可以补充：
4. `detectWeixinArticlePage`
5. `waitForStableContent` 的核心逻辑测试

---

## 十二、工程质量要求

请不要只给最小 demo，我需要的是一个可维护的工程化版本。

额外要求：

1. 所有提取逻辑必须模块化
2. 共享类型统一管理
3. 状态要分清：

   * article 数据
   * UI 展示状态
   * 后端发送状态
4. 提取失败时要返回可诊断错误
5. 后端发送失败时要有明确状态提示
6. 页面不是公众号文章时，也要有明确 UI 状态
7. README 中写清楚如何：

   * 本地开发
   * 启动项目
   * 构建扩展
   * 在 Chrome 中以 unpacked extension 方式加载
   * 配置后端地址
   * 手动测试提取和发送

---

## 十三、实现偏好

请遵守以下偏好：

1. 主 UI 是页面内注入面板，不要用 popup 做主入口
2. 不要用 Chrome Side Panel
3. 不要在 content script 中直接把后端配置写死
4. 不要把所有逻辑堆在一个 content script 文件里
5. Markdown 生成必须基于清洗后的 DOM
6. outline 需要支持非语义标题推断
7. 重要状态要能通过 storage 恢复
8. 所有关键按钮和状态元素必须提供 `data-testid`
9. UI 风格简洁克制，工程工具感，不要花哨

---

## 十四、非目标（当前版本不要实现）

当前 v0 不要实现：

* 批量自动打开链接
* 多站点支持
* 插件内 AI 摘要
* PDF 导出
* 登录态模拟
* 绕过权限、验证码或风控逻辑
* 浏览器级 side panel
* 云端任务调度

---

## 十五、最终输出要求

请直接输出完整可运行方案，包括：

1. 项目目录结构
2. manifest / Plasmo 配置
3. content script 代码
4. 页面内注入面板 React 代码
5. background service worker 代码
6. article extractor 相关模块
7. markdown exporter 模块
8. storage / config 模块
9. types 定义
10. 基础单测
11. README

请优先交付一个**结构清晰、可运行、后续可扩展**的 v0 版本，而不是演示型 demo。
