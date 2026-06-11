# AINote — 全能文件阅读器 & Chrome 扩展

> AI 输出的 Markdown、Jupyter Notebook、CSV、GeoJSON 等文件在浏览器中完美渲染。同时提供独立的 Web 阅读器和 Chrome 浏览器扩展两种使用方式。

[![GitHub](https://img.shields.io/badge/GitHub-openpeng/ainote-blue?logo=github)](https://github.com/openpeng/ainote)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ 功能特性

### 🎨 图表渲染（8 种引擎）

| 格式 | 引擎 | 说明 |
|------|------|------|
| **Mermaid** | mermaid.js | 流程图、时序图、类图、甘特图等 |
| **PlantUML** | PlantUML Server | 架构图、组件图、状态图（多服务器 fallback） |
| **Graphviz / DOT** | @viz-js/viz | 有向图、依赖图 |
| **D2** | D2 API | 现代架构图、数据流图 |
| **WaveDrom** | wavedrom | 数字时序图、波形图 |
| **Nomnoml** | nomnoml | 简洁 UML 类图、关系图 |
| **Vega** | vega-embed | 声明式数据可视化图表 |

### 📄 文件格式支持（6 种）

| 格式 | 说明 |
|------|------|
| **Markdown** (`.md` `.markdown`) | 完整 Markdown 渲染，含图表/公式/代码 |
| **Jupyter Notebook** (`.ipynb`) | Code/Markdown/Raw 三种 Cell 渲染 |
| **CSV / TSV** (`.csv` `.tsv`) | 交互式表格浏览 |
| **GeoJSON** (`.geojson` `.topojson`) | Leaflet 地图可视化 |
| **AsciiDoc** (`.adoc` `.asciidoc`) | AsciiDoctor 文档渲染 |
| **JSON** (`.json`) | 可折叠语法树查看器 |

### 🖥️ 代码高亮

- **Shiki** — VS Code 同款语法高亮，190+ 语言支持
- 亮色/暗色主题自动适配

### 🔢 数学公式

- **KaTeX** 渲染行内公式 `$...$` 和块级公式 `$$...$$`

### 🛠️ 工具功能

- ✏️ **编辑器模式** — 左右分栏实时预览
- 📄 **PDF 导出** — 保留完整样式输出
- ⚙️ **设置面板** — 主题 / 字号 / PlantUML 服务器配置
- 🎭 **主题切换** — Light / Dark
- ⌨️ **键盘快捷键** — `Ctrl+Shift+R` 渲染，`Ctrl+Shift+E` 编辑器，`Ctrl+Shift+D` 导出
- 🖱️ **右键菜单** — 快捷渲染/恢复/导出 (仅 Chrome 扩展)

---

## 📦 两种使用方式

### 方式一：Chrome 浏览器扩展

`public/` 目录是一个完整的 Manifest V3 Chrome 扩展程序。

```bash
# 加载步骤
1. 打开 Chrome，访问 chrome://extensions/
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 public/ 文件夹
```

加载后访问任意 `.md` / `.ipynb` / `.csv` / `.geojson` / `.adoc` / `.json` 文件，扩展会自动检测并提供渲染工具栏。

### 方式二：独立 Web 阅读器

Web 应用支持拖放或点击上传本地文件，在浏览器中直接渲染。

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

构建后 `dist/` 目录同时包含 Web 应用和 Chrome 扩展文件，可同时用于静态部署和扩展加载。

---

## 📁 项目结构

```
ainote/
├── public/                        # 🔌 Chrome 扩展源码 (Manifest V3)
│   ├── manifest.json              # 扩展配置
│   ├── background.js              # Service Worker（右键菜单、快捷键）
│   ├── bridge.js                  # 隔离世界通信桥梁
│   ├── content.js                 # 内容脚本（核心编排器）
│   ├── popup.html / popup.js      # 弹出设置面板
│   ├── CHROME_EXTENSION.md        # 扩展目录说明文档
│   ├── renderers/                 # 模块化渲染器（14 个）
│   │   ├── renderer-registry.js   #   渲染器注册中心
│   │   ├── render-pipeline.js     #   渲染管线调度
│   │   └── renderer-*.js          #   各图表/格式渲染器
│   ├── styles/                    # 扩展样式
│   ├── lib/                       # 本地化第三方库（CSP 安全）
│   └── icons/                     # 扩展图标
├── src/                           # 🌐 Web 应用源码 (Vite + ESM)
│   ├── css/style.css              # 页面样式
│   └── js/
│       ├── main.js                # 主入口（编排器）
│       ├── parser.js              # Markdown 解析器（markdown-it + 插件）
│       ├── settings.js            # 设置管理（localStorage）
│       ├── renderers/             # 图表/格式渲染器（13 个）
│       │   ├── renderer-registry.js   # 渲染器注册中心
│       │   ├── render-pipeline.js     # 渲染管线调度
│       │   └── renderer-*.js          # 各渲染器（ESM 模块）
│       └── components/            # UI 组件
│           ├── toolbar.js         #   工具栏
│           ├── settings-panel.js  #   设置面板
│           ├── editor-mode.js     #   编辑器模式
│           └── pdf-export.js      #   PDF 导出
├── docs/                          # 测试文档
├── index.html                     # Web 应用入口
├── vite.config.js                 # Vite 构建配置
└── package.json                   # 项目依赖
```

### 两种模式的渲染器对比

| 渲染器 | Chrome 扩展 (`public/`) | Web 应用 (`src/`) |
|--------|------------------------|-------------------|
| Mermaid | mermaid.js CDN | mermaid npm |
| PlantUML | pako CDN + 多服务器 | pako npm + 多服务器 |
| Graphviz | viz.js CDN | @viz-js/viz npm |
| D2 | D2 API | D2 API |
| WaveDrom | CDN | wavedrom npm |
| Nomnoml | CDN | nomnoml CDN |
| Vega | CDN | vega-embed npm |
| 代码高亮 | Highlight.js CDN | Shiki npm |
| IPYNB | 纯 JS | 纯 JS |
| CSV | 纯 JS | 纯 JS |
| GeoJSON | Leaflet CDN | leaflet npm |
| AsciiDoc | Asciidoctor CDN | asciidoctor npm |
| JSON | 纯 JS | 纯 JS |

---

## ⚙️ 设置说明

| 配置项 | 选项 | 说明 |
|--------|------|------|
| **主题** | Light / Dark | 切换渲染主题 |
| **字体大小** | 12px ~ 24px | 调整正文字号 |
| **PlantUML 服务器** | 自动 / 官方 / 自定义 | 解决 PlantUML 图表加载慢的问题 |
| **自定义服务器地址** | 用户输入 | 填入私有 PlantUML 服务器地址 |

### PlantUML 多服务器 Fallback

当选择「自动」模式时，AINote 会依次尝试以下服务器，直到成功（每个服务器 8 秒超时）：

1. `www.plantuml.com` — 官方服务器
2. 用户自定义服务器（如已配置）

---

## 🛠️ 技术栈

| 类型 | 技术 |
|------|------|
| 构建工具 | [Vite](https://vitejs.dev/) |
| Markdown 解析 | [markdown-it](https://github.com/markdown-it/markdown-it) + 8 个插件 |
| 流程图 | [Mermaid.js](https://mermaid.js.org/) |
| UML 图 | [PlantUML](https://plantuml.com/) |
| 有向图 | [@viz-js/viz](https://github.com/mdaines/viz-js) |
| 架构图 | [D2](https://d2lang.com/) |
| 时序图 | [WaveDrom](https://wavedrom.com/) |
| UML 类图 | [nomnoml](https://www.nomnoml.com/) |
| 数据可视化 | [Vega-Lite](https://vega.github.io/vega-lite/) + [vega-embed](https://github.com/vega/vega-embed) |
| 公式渲染 | [KaTeX](https://katex.org/) |
| 代码高亮 | [Shiki](https://shiki.style/) (Web) / [Highlight.js](https://highlightjs.org/) (扩展) |
| 地图渲染 | [Leaflet](https://leafletjs.com/) |
| AsciiDoc | [Asciidoctor](https://asciidoctor.org/) |
| 文本压缩 | [pako](https://github.com/nodeca/pako) |
| 扩展规范 | [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) |

---

## 📋 更新日志

### v1.6.0 (2026-06)

- 🌐 **Web 应用重磅升级** — 实现与 Chrome 扩展完全一致的功能
  - 新增 7 种图表引擎：PlantUML（动态多服务器）、Graphviz、D2、WaveDrom、Nomnoml、Vega
  - 新增 5 种文件格式：IPYNB、CSV、GeoJSON、AsciiDoc、JSON
  - 新增编辑器模式（分屏实时预览）
  - 新增设置面板（主题/字号/PlantUML 服务器）
  - 新增 PDF 导出
  - 代码高亮从 Highlight.js 升级为 Shiki
- 🏗 **架构重构** — 采用渲染器注册表 + 管线模式，`src/js/renderers/` 下 13 个独立渲染器
- 📂 标记 `public/` 目录为 Chrome 扩展源码目录（`CHROME_EXTENSION.md`）
- 📝 更新 README，完善文档说明

### v1.3.0 (2026-06)

- 🔧 **模块化渲染架构**：重构 content.js 为 16 个独立渲染器模块
- ✨ 新增 WaveDrom、Nomnoml、Vega-Lite 图表支持
- ✨ 新增 IPYNB、CSV、GeoJSON、AsciiDoc、JSON 文件格式支持
- 🔒 CSP 安全修复：所有库文件本地化至 `public/lib/`

### v1.0.0

- 🎉 初始发布：Mermaid + PlantUML + KaTeX + Highlight.js

---

## 📄 开源协议

[MIT License](LICENSE)

---

> ⭐ 如果这个项目对你有帮助，欢迎 Star！
