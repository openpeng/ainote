# Chrome 扩展程序目录 (Chrome Extension)

> 此目录是 **AINote Markdown Renderer** Chrome 浏览器扩展的源代码。

## 如何安装

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择此目录（`public/`）或构建后的 `dist/` 目录

## 功能

- 自动渲染 `.md` / `.drawio` / `.ipynb` / `.csv` / `.geojson` / `.adoc` / `.json` 文件
- 支持 Mermaid / PlantUML / D2 / Graphviz / WaveDrom / Nomnoml / Vega 图表
- KaTeX 数学公式渲染
- 代码语法高亮（190+ 语言）
- PDF 导出
- 编辑器模式（实时预览）

## 目录结构

```
public/
├── manifest.json          # Chrome 扩展清单 (Manifest V3)
├── background.js           # Service Worker (后台服务)
├── content.js             # 内容脚本（主编排器）
├── bridge.js              # 隔离世界桥接
├── popup.html / popup.js  # 弹出设置面板
├── renderers/             # 渲染器插件
├── lib/                   # 本地化第三方库
├── styles/                # 样式文件
└── icons/                 # 扩展图标
```

## 构建说明

运行 `npm run build` 会将此目录完整复制到 `dist/`，同时将 `src/` 下的 Web 应用打包到 `dist/assets/`。
