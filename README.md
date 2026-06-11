# AINote — AI 输出 Markdown 增强阅读器

> 让 AI 生成的 Markdown 文档（含各种图表、公式、代码）在浏览器中完美渲染。

[![GitHub](https://img.shields.io/badge/GitHub-openpeng/ainote-blue?logo=github)](https://github.com/openpeng/ainote)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ 功能特性

AINote 是一个浏览器扩展 + Web 阅读器，专门解决 **AI 输出的 Markdown 无法在网页中正常渲染** 的问题。

### 🎨 支持的图表格式

| 格式 | 引擎 | 说明 |
|------|------|------|
| **Mermaid** | mermaid.js | 流程图、时序图、类图、甘特图等 |
| **PlantUML** | PlantUML Server | 架构图、组件图、状态图（多服务器 fallback） |
| **Graphviz / DOT** | viz.js | 有向图、依赖图 |
| **D2** | D2 API | 现代架构图、数据流图 |

### 📐 数学公式

- **KaTeX** 渲染行内公式 `$...$` 和块级公式 `$$...$$`
- 自动处理转义符 `\$`（不渲染）

### 🖥️ 代码高亮

- **Highlight.js** 自动检测语言并高亮
- 支持 190+ 语言
- 多套主题可切换

### 📄 其他功能

- �导出 PDF（保留样式）
- ✍️ 编辑器模式（左右分栏实时预览）
- 🎭 多套主题（默认 / GitHub / VuePress / GitBook）
- ⌨️ 键盘快捷键（`Ctrl+Shift+R` 渲染，`Ctrl+Shift+E` 编辑器，`Ctrl+Shift+D` 导出 PDF）
- 🖱️ 右键菜单快捷操作
- 🌐 自动检测 `.md` 文件（GitHub / GitLab 等）

---

## 📦 安装方式

### 方式一：从 Release 安装（推荐）

> 即将发布 🚧

1. 前往 [Releases](https://github.com/openpeng/ainote/releases) 下载最新版 `ainote-vX.X.X.zip`
2. 解压得到 `ainote/` 文件夹
3. 打开浏览器扩展管理页面：
   - **Chrome / Edge**：`chrome://extensions/`
   - **Firefox**：`about:debugging`
4. 开启「开发者模式」
5. 点击「加载已解压的扩展」，选择 `ainote/` 文件夹

### 方式二：从源码构建

```bash
# 1. 克隆仓库
git clone https://github.com/openpeng/ainote.git
cd ainote

# 2. 安装依赖
npm install

# 3. 构建 Web 应用（可选，用于独立阅读器）
npm run build

# 4. 加载浏览器扩展
# 将 public/ 文件夹作为扩展加载到浏览器
```

---

## 🚀 使用指南

### 自动渲染

访问任意 `.md` 文件（如 GitHub 上的 README），扩展会自动检测并提示渲染。

### 手动渲染

1. 点击工具栏中的 AINote 图标
2. 在弹出面板中选择主题
3. 点击「渲染当前页面」

### 编辑器模式

1. 点击工具栏图标 → 「编辑器模式」
2. 在左侧输入 Markdown，右侧实时预览
3. 支持所有图表和公式语法

### 导出 PDF

渲染完成后，点击「导出 PDF」或按 `Ctrl+Shift+D`，浏览器打印界面选择「另存为 PDF」。

---

## ⚙️ 配置说明

点击工具栏图标，在弹出面板中配置：

| 配置项 | 选项 | 说明 |
|--------|------|------|
| **主题** | 默认 / GitHub / VuePress / GitBook | 切换渲染主题 |
| **PlantUML 服务器** | 自动 / 官方 / 自定义 | 解决 PlantUML 图表加载慢的问题 |
| **自定义服务器地址** | 用户输入 | 填入私有 PlantUML 服务器地址 |

### PlantUML 多服务器 Fallback

当选择「自动」模式时，AINote 会依次尝试以下服务器，直到成功：

1. `www.plantuml.com` — 官方服务器
2. `plantuml.pages.dev` — 社区镜像
3. 用户自定义服务器（如已配置）

每个服务器有 **8 秒超时**，失败自动切换下一个。

---

## 📁 项目结构

```
ainote/
├── public/                    # 浏览器扩展（Manifest V3）
│   ├── manifest.json          # 扩展配置
│   ├── background.js          # Service Worker（右键菜单、快捷键）
│   ├── bridge.js              # 隔离世界通信桥梁
│   ├── content.js             # 内容脚本（核心渲染逻辑）
│   ├── popup.html             # 弹出面板 UI
│   ├── popup.js               # 弹出面板逻辑
│   ├── styles/
│   │   ├── content.css        # 渲染样式
│   │   └── popup.css          # 弹出面板样式
│   ├── lib/                   # 本地化库文件（CSP 安全）
│   │   ├── mermaid.min.js     # Mermaid 图表渲染 (2.6MB)
│   │   ├── katex.min.js/css   # KaTeX 数学公式
│   │   ├── markdown-it.min.js # Markdown 解析器
│   │   ├── highlight.min.js   # 代码高亮
│   │   ├── pako.min.js        # PlantUML 文本压缩
│   │   ├── viz.min.js         # Graphviz/DOT 渲染
│   │   ├── languages/         # Highlight.js 语言包 (15+)
│   │   ├── styles/            # Highlight.js 主题 CSS
│   │   └── fonts/             # KaTeX 字体文件
│   └── icon*.svg              # 扩展图标
├── src/                       # Web 应用源码
│   ├── css/style.css          # 页面样式
│   ├── js/main.js             # 主入口
│   └── js/parser.js           # Markdown 解析器
├── docs/                      # 测试文档
│   ├── test-ainote.md         # 功能测试文档
│   ├── test-arch.md           # 架构图测试文档
│   ├── EXTENSION_LOADING.md   # 扩展加载说明
│   └── EXTENSION_TESTING.md   # 扩展测试计划
├── index.html                 # Web 应用入口
├── vite.config.js             # Vite 构建配置
└── package.json               # 项目依赖
```

---

## 🛠️ 技术栈

| 类型 | 技术 |
|------|------|
| 构建工具 | [Vite](https://vitejs.dev/) |
| Markdown 解析 | [markdown-it](https://github.com/markdown-it/markdown-it) |
| 流程图 | [Mermaid.js](https://mermaid.js.org/) |
| UML 图 | [PlantUML](https://plantuml.com/)（pako 压缩 + 多服务器） |
| 有向图 | [viz.js](https://github.com/mdaines/viz.js) |
| 架构图 | [D2](https://d2lang.com/) |
| 公式渲染 | [KaTeX](https://katex.org/) |
| 代码高亮 | [Highlight.js](https://highlightjs.org/) |
| 扩展规范 | [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) |

---

## 🔒 CSP 安全与本地化

为兼容 Chrome Manifest V3 的 **内容安全策略 (CSP)**，所有第三方库已本地化放置在 `public/lib/` 目录下，扩展不再依赖任何外部 CDN 资源。

### 隔离世界加载

Manifest V3 的内容脚本运行在隔离世界 (isolated world) 中，无法直接访问页面 DOM 的全局变量。AINote 通过 `bridge.js` 实现内容脚本与页面上下文的通信桥梁，确保：

- 本地库注入到页面上下文（`page` world），避免 CSP 冲突
- 内容脚本通过 CustomEvent 与注入的库进行通信
- 渲染结果回传到内容脚本侧进行 DOM 操作

### 渲染错误提示

当图表/公式渲染失败时，AINote 会显示结构化的错误信息卡片，包含：
- 错误原因说明
- 可展开查看原始代码
- 适配亮色/暗色主题

---

## 🐛 已知问题

- [ ] PlantUML 图表 URL 长度超过 8000 字符时会降级为图片上传方式（尚未实现 Server 模式）
- [ ] Firefox 上 `browser.action` API 需要适配（当前主要测试 Chrome/Edge）
- [ ] 大型 Mermaid 图表渲染可能卡顿

欢迎提交 Issue 和 PR！

---

## 🔮 路线图

- [ ] 打包为 `.crx` / `.xpi` 正式发布
- [ ] 支持更多图表格式（WaveDrom、Bytefield 等）
- [ ] 可嵌入 SDK（`ainote.min.js`，一行代码集成到任意网页）
- [ ] 暗黑模式
- [ ] 离线模式（内置 PlantUML 渲染服务）
- [ ] 移动端适配

---

## 📋 更新日志

### v1.5.0 (2026-06)

- 🔒 **CSP 安全修复**：所有库文件本地化至 `public/lib/`，不再依赖外部 CDN
- 🔧 **隔离世界修复**：新增 `bridge.js`，解决 Manifest V3 content script 与页面上下文通信问题
- 🎨 **渲染错误提示**：图表/公式渲染失败时显示结构化错误信息卡片
- 🎨 **PlantUML 降级优化**：失败时展示更友好的错误界面，支持亮暗主题

### v1.4.0 (2026-06)

- 📖 添加详细的 README 文档

### v1.3.0

- 🚀 PlantUML 多服务器 Fallback，支持自定义服务器
- ⏱ 每个服务器 8 秒超时自动切换

### v1.2.1

- 🐛 优化 PlantUML 编码逻辑

### v1.2.0

- ✨ 支持 D2、Graphviz/DOT 等多格式 AI 架构图
- ✨ 新增 viz.js 和 D2 API 集成

### v1.1.0

- ✨ 编辑器模式（左右分栏实时预览）
- ✨ PDF 导出保留样式
- ✨ 右键菜单快捷操作
- ✨ 键盘快捷键
- ✨ 多套主题（默认 / GitHub / VuePress / GitBook）

### v1.0.0

- 🎉 初始发布：Mermaid + PlantUML + KaTeX + Highlight.js

---

## 📄 开源协议

[MIT License](LICENSE)

---

## 🙏 致谢

感谢以下开源项目的支持：

- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown 解析
- [Mermaid](https://mermaid.js.org/) — 图表渲染
- [KaTeX](https://katex.org/) — 公式渲染
- [Highlight.js](https://highlightjs.org/) — 代码高亮
- [PlantUML](https://plantuml.com/) — UML 图表
- [pako](https://github.com/nodeca/pako) — PlantUML 文本压缩

---

> ⭐ 如果这个项目对你有帮助，欢迎 Star！
