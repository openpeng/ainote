# AINote Chrome 扩展 — 加载说明

## 安装到 Chrome / Edge

### 步骤 1：打开扩展管理页面
- **Chrome**：地址栏输入 `chrome://extensions/`
- **Edge**：地址栏输入 `edge://extensions/`

### 步骤 2：启用开发者模式
- 右上角打开 **「开发者模式」** 开关

### 步骤 3：加载扩展
- 点击 **「加载已解压的扩展程序」**
- 选择 `public/` 目录
- 扩展应出现在列表中，状态为 **「已启用」**

### 步骤 4：测试
1. 访问任意原始 `.md` 文件（如 `raw.githubusercontent.com` 的链接）
2. 页面右下角出现浮动工具栏
3. 点击 **「📝 渲染」** 即可渲染

> **注意**：在 GitHub/GitLab 等平台的 blob 页面（已自带渲染）上不会出现工具栏，只在原始文本页面触发。

---

## 功能说明

### 支持的图表格式

| 格式 | 说明 |
|------|------|
| Mermaid | 流程图、时序图、类图、甘特图 |
| PlantUML | UML 架构图、组件图、状态图（多服务器 fallback） |
| Graphviz / DOT | 有向图、依赖图 |
| D2 | 现代架构图、数据流图 |
| WaveDrom | 数字时序图、波形图 |
| Nomnoml | 简洁 UML 类图 |
| Vega | 声明式数据可视化 |

### 支持的独立文件格式

| 格式 | 说明 |
|------|------|
| `.md` `.markdown` | Markdown 渲染 |
| `.ipynb` | Jupyter Notebook |
| `.csv` `.tsv` | 交互式表格 |
| `.geojson` `.topojson` | 地图可视化 |
| `.adoc` `.asciidoc` | AsciiDoc 文档 |
| `.json` | 可折叠 JSON 查看器 |

### 工具栏功能

渲染完成后底部工具栏提供：
- **📝 渲染** — 将原始 Markdown 渲染为 HTML
- **✏️ 编辑器** — 分屏实时预览编辑模式
- **📄 导出 PDF** — 打印为 PDF 文件
- **🔙 恢复** — 恢复原始页面

### 目录功能

- 渲染 `.md` 文件后自动展开左侧浮动目录面板
- H1/H2/H3 标题形成树形嵌套结构
- 点击目录项平滑跳转到对应章节
- 点击目录面板右上角 **×** 可关闭

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+R` | 渲染 / 恢复 |
| `Ctrl+Shift+E` | 编辑器模式 |
| `Ctrl+Shift+D` | 导出 PDF |

### 右键菜单

在支持的页面上右键，可通过菜单快速操作。

---

## 文件结构

```
public/
├── manifest.json              # 扩展配置 (Manifest V3)
├── background.js              # Service Worker（右键菜单、快捷键）
├── bridge.js                  # 隔离世界通信桥梁
├── content.js                 # 内容脚本（核心编排器）
├── popup.html / popup.js      # 弹出设置面板
├── CHROME_EXTENSION.md        # 扩展说明文档
├── renderers/                 # 模块化渲染器（14 个）
│   ├── renderer-registry.js   #   渲染器注册中心
│   ├── render-pipeline.js     #   渲染管线调度
│   └── renderer-*.js          #   各图表/格式渲染器
├── lib/                       # 本地化第三方库（CSP 安全）
│   ├── mermaid.min.js         #   Mermaid 图表渲染
│   ├── katex.min.js/css       #   KaTeX 数学公式
│   ├── markdown-it.min.js     #   Markdown 解析器
│   ├── highlight.min.js       #   代码高亮
│   ├── pako.min.js            #   PlantUML 文本压缩
│   ├── viz.min.js             #   Graphviz/DOT 渲染
│   ├── languages/             #   Highlight.js 语言包
│   ├── styles/                #   Highlight.js 主题 CSS
│   └── fonts/                 #   KaTeX 字体
├── styles/                    # 扩展样式
└── icons/                     # 扩展图标
```

---

## MD 文件检测策略

扩展使用行为检测判断是否触发渲染：

- **触发**：页面是原始文本（raw 地址、纯 `<pre>` 文本）
- **跳过**：页面已有渲染好的 Markdown（GitHub/GitLab blob 页等）
- **兼容**：内网自建 GitLab/Gitea/Gogs 等自动识别，无需域名配置

---

## 本地化库（CSP 安全）

为兼容 Manifest V3 的内容安全策略，所有第三方库已本地化至 `public/lib/`，扩展不依赖外部 CDN。

加载时通过 `bridge.js` 在隔离世界和页面主世界之间建立通信，确保本地库可被内容脚本安全访问。

---

## 开发调试

### 修改代码后
1. 修改 `public/` 目录下的文件
2. 在扩展管理页面点击 **「重新加载」**
3. 刷新测试页面

### 调试入口
- **内容脚本**：测试页面按 F12 → Console（`[AINote]` 前缀日志）
- **Popup**：右键扩展图标 → 「检查弹出窗口」
- **Service Worker**：扩展管理页 → 点击 Service Worker 链接

---

## 更新扩展

扩展更新 `public/` 代码后，在 `chrome://extensions/` 点击 **「重新加载」** 即可。如需完整重新构建，运行 `npm run build` 后加载 `dist/` 目录。

## 卸载

在 `chrome://extensions/` 找到 AINote，点击 **「移除」**。
