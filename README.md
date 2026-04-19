# MP Article Assistant

基于 Manifest V3 + Plasmo + React + TypeScript 的微信公众号文章页内工作台。

仅支持页面：
- `https://mp.weixin.qq.com/s/*`
- `https://mp.weixin.qq.com/s?*`

## 1. 功能

- 页面内双面板设计：左侧展示元信息与 Outline，右侧为状态、操作与配置
- 自动/手动提取公众号文章
- 提取文章结构化数据 `WeixinArticle`
- Outline 展示与锚点跳转
- 发送文章到后端 `POST /api/articles/collect`
- 将提取结果转 Markdown 并复制
- 状态展示与持久化恢复（storage）

## 2. 技术栈

- Chrome Extension Manifest V3
- Plasmo
- React 18
- TypeScript
- Shadow DOM 注入 UI
- `chrome.storage` 存储配置和状态

## 3. 目录结构

- `contents/weixin-content.tsx`: content script 注入入口、页面工作台主流程（挂载左右两个面板）
- `background/index.ts`: service worker，消息路由与后端调用
- `components/AssistantPanel.tsx`: 右侧操作面板 React 组件（状态、操作、配置）
- `components/MetadataOutlinePanel.tsx`: 左侧元信息与 Outline 面板 React 组件
- `lib/*`: 纯逻辑模块（识别、提取、outline、markdown、滚动）
- `storage/*`: storage 读写模块
- `types/*`: 共享类型
- `styles/panel.css`: 面板样式（左右定位）
- `tests/*`: 纯函数单测

## 4. 本地开发

1. 安装依赖

```bash
pnpm install
```

2. 启动开发模式

```bash
pnpm dev
```

3. 构建生产包

```bash
pnpm build
```

4. 打包

```bash
pnpm package
```

## 5. 在 Chrome 里加载 Unpacked 扩展

1. 打开 Chrome 扩展页：`chrome://extensions`
2. 打开右上角开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择 Plasmo 生成目录（通常是 `build/chrome-mv3-dev` 或 `build/chrome-mv3-prod`）

## 6. 后端配置

在页面内面板的“后端配置”区域设置：

- `API Base URL`，例如 `https://api.example.com`
- `API Token`（可选）

配置通过 `chrome.storage.local` 持久化保存。

## 7. 手动测试步骤

1. 打开公众号文章页面（`mp.weixin.qq.com/s*`）
2. 左侧应出现元信息面板，右侧应出现操作面板
3. 点击右侧"提取文章"
4. 检查右侧状态区是否显示"已提取"及提取时间
5. 检查左侧元信息、outline 是否展示
6. 点击左侧 outline 项，验证页面滚动定位
7. 点击右侧"复制 Markdown"，粘贴验证结构
8. 配置右侧后端地址后点击"发送后端"，验证状态变为"已发送"

## 8. 自动化可操作节点

关键元素已包含稳定属性：

### 左侧面板（元信息 & Outline）
- `data-testid="metadata-outline-panel-root"` - 面板根容器
- `data-testid="metadata-panel-toggle-btn"` - 折叠按钮
- `data-testid="outline-list"` - Outline 列表
- `data-testid="outline-item-{anchor}"` - 各 outline 项

### 右侧面板（状态、操作、配置）
- `data-testid="assistant-panel-root"` - 面板根容器
- `data-testid="panel-toggle-btn"` - 折叠按钮
- `data-testid="extract-article-btn"` - 提取文章按钮
- `data-testid="reextract-article-btn"` - 重新提取按钮
- `data-testid="send-backend-btn"` - 发送后端按钮
- `data-testid="copy-markdown-btn"` - 复制 Markdown 按钮
- `data-testid="extract-status"` - 提取状态显示
- `data-testid="send-status"` - 发送状态显示
- `data-testid="error-status"` - 错误信息显示
- `data-testid="backend-url-input"` - 后端地址输入框
- `data-testid="backend-token-input"` - 后端 Token 输入框
- `data-testid="auto-extract-checkbox"` - 自动提取复选框

## 9. 测试

执行测试：

```bash
pnpm test
```

已包含测试：
- `parseWeixinUrlParams`
- `buildArticleOutline`
- `convertHtmlToMarkdown`
- `detectWeixinArticlePage`
