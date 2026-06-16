# Chrome 扩展程序目录 (Chrome Extension)

> 此目录是 **AINote** Chrome 浏览器扩展的源代码 (Manifest V3)。

## 如何安装

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **「开发者模式」**
3. 点击 **「加载已解压的扩展程序」**
4. 选择此目录（`public/`）或构建后的 `dist/` 目录

## 功能特性

- 自动渲染原始 `.md` 文件（智能跳过 GitHub/GitLab 等平台已渲染页面）
- 渲染后自动展开目录面板（左侧浮动树形目录）
- 支持 **8 种**图表引擎：Mermaid / PlantUML / Graphviz / D2 / WaveDrom / Nomnoml / Vega
- 支持 **6 种**文件格式：`.md` / `.ipynb` / `.csv` `.tsv` / `.geojson` `.topojson` / `.adoc` `.asciidoc` / `.json`
- KaTeX 数学公式、Highlight.js 代码高亮
- 编辑器模式（分屏实时预览）、PDF 导出
- 本地化库（CSP 安全，无外部 CDN 依赖）

## 目录结构

```
public/
├── manifest.json           # Chrome 扩展清单 (Manifest V3)
├── background.js           # Service Worker (右键菜单、快捷键)
├── bridge.js               # 隔离世界通信桥
├── content.js              # 内容脚本（主编排器）
├── popup.html / popup.js   # 弹出设置面板
├── renderers/              # 渲染器插件 (14 个)
│   ├── renderer-registry.js   #   注册中心
│   ├── render-pipeline.js     #   渲染管线
│   └── renderer-*.js          #   各图表/格式渲染器
├── lib/                    # 本地化第三方库 (CSP 安全)
│   ├── mermaid.min.js      #   Mermaid 图表
│   ├── katex.min.js/css    #   KaTeX 公式
│   ├── markdown-it.min.js  #   Markdown 解析
│   ├── highlight.min.js    #   代码高亮
│   ├── pako.min.js         #   PlantUML 压缩
│   ├── viz.min.js          #   Graphviz/DOT
│   ├── languages/          #   高亮语言包
│   ├── styles/             #   高亮主题 CSS
│   └── fonts/              #   数学字体
├── styles/                 # 扩展样式
└── icons/                  # 扩展图标
```

## 构建说明

运行 `npm run build` 会将此目录完整复制到 `dist/`，同时将 `src/` 下的 Web 应用打包到 `dist/assets/`。
