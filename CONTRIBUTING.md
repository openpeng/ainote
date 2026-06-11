# 贡献指南 (Contributing Guide)

欢迎为 AINote 贡献代码！本文档将帮助你了解项目结构、开发流程和代码规范。

## 目录

- [项目概览](#项目概览)
- [开发环境准备](#开发环境准备)
- [项目架构](#项目架构)
- [添加新的图表渲染器](#添加新的图表渲染器)
- [添加新的文件格式渲染器](#添加新的文件格式渲染器)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [调试技巧](#调试技巧)

---

## 项目概览

AINote 有两种运行模式，使用不同的 JavaScript 模块系统：

| | Chrome 扩展 (`public/`) | Web 应用 (`src/`) |
|---|---|---|
| **运行环境** | Chrome 扩展 Manifest V3 | Vite SPA (`index.html`) |
| **模块系统** | IIFE (`(function(){...})()`) | ESM (`import`/`export`) |
| **入口文件** | `content.js` + `manifest.json` 中的 `content_scripts` | `main.js` by `<script type="module">` |
| **全局命名** | `window.AINoteRenderers` / `AINotePipeline` | 非全局 (Vite 处理导入) |
| **依赖加载** | CDN 动态加载 + `bridge.js` + `chrome.runtime.getURL()` | npm 包，由 Vite 打包 |
| **构建** | 无需构建，直接复制到 `dist/` | Vite 打包到 `dist/assets/` |

两种模式共享相同的**注册表 + 管线**模式，但渲染器文件是**独立维护**的。

---

## 开发环境准备

```bash
# 克隆仓库
git clone git@github.com:openpeng/ainote.git
cd ainote

# 安装依赖
npm install

# 启动 Web 应用开发服务器 (localhost:3000)
npm run dev

# 构建生产版本 (输出到 dist/)
npm run build

# 预览生产版本
npm run preview
```

### 加载 Chrome 扩展进行开发

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `public/` 目录

`npm run build` 后 `dist/` 同时包含 Web 应用和扩展文件，也可选择加载 `dist/` 目录。

---

## 项目架构

```
ainote/
├── public/                    # Chrome 扩展源码
│   ├── manifest.json          #   扩展配置 (版本/权限/入口)
│   ├── content.js             #   内容脚本编排器
│   ├── background.js          #   Service Worker
│   ├── bridge.js              #   隔离世界通信桥
│   ├── popup.html / js        #   弹出设置页
│   ├── renderers/             #   渲染器 (14个，IIFE 模式)
│   │   ├── renderer-registry.js   #   注册中心
│   │   ├── render-pipeline.js     #   渲染管线
│   │   └── renderer-*.js          #   各图表/格式渲染器
│   ├── lib/                   #   本地化第三方库 (CSP安全)
│   └── styles/                #   扩展样式
├── src/                       # Web 应用源码
│   ├── css/style.css          #   全局样式
│   └── js/
│       ├── main.js            #   主入口 (编排器)
│       ├── parser.js          #   markdown-it 解析器
│       ├── settings.js        #   设置管理 (localStorage)
│       ├── renderers/         #   渲染器 (13个，ESM 模式)
│       │   ├── renderer-registry.js
│       │   ├── render-pipeline.js
│       │   └── renderer-*.js
│       └── components/        #   UI 组件
│           ├── toolbar.js
│           ├── settings-panel.js
│           ├── editor-mode.js
│           └── pdf-export.js
├── index.html                 # Web 应用入口
├── vite.config.js             # Vite 构建配置
└── package.json
```

### 渲染管线流程

```
文件打开 → 格式检测 → Markdown 解析(仅md) → 渲染管线
                                              │
                    ┌─────────────────────────┘
                    ▼
         registry.getApplicable(container)
                    │
                    ▼
         顺序执行每个 renderer.render()
           (一个失败不影响其他)
                    │
                    ▼
         返回 { success: [...], failed: [...] }
```

---

## 添加新的图表渲染器

图表渲染器处理 Markdown 中的 fence code block (如 ` ```mermaid ` ` ```d2 `)。

### 渲染器注册接口

```javascript
registry.register({
    id: 'xxx',                     // 唯一标识符，如 'mermaid'
    name: '显示名称',               // 人类可读的名称
    codeBlockLanguages: ['xxx'],   // 对应的代码块语言标签
    // 以下仅用于 Chrome 扩展模式:
    dependencies: ['https://cdn...'],      // CDN JS 依赖
    cssDependencies: ['https://cdn...'],   // CDN CSS 依赖

    detect(container) {            // 判断是否需要此渲染器
        return container.querySelectorAll('code.language-xxx').length > 0;
    },

    async render(container, ctx) { // 执行渲染
        // container: 包含 Markdown 内容的 DOM 容器
        // ctx: 渲染上下文 (settings, escapeHtml, showError, ...)
    }
});
```

### 步骤 1: 扩展模式 (`public/renderers/renderer-xxx.js`)

```javascript
// ========== Xxx 图表渲染器 ==========
(function() {
  'use strict';

  AINoteRenderers.register({
    id: 'xxx',
    name: 'Xxx 图表',
    codeBlockLanguages: ['xxx'],
    dependencies: [
      'https://cdn.jsdelivr.net/npm/xxx@1.0.0/dist/xxx.min.js'
    ],

    detect: function(container) {
      return container.querySelectorAll('code.language-xxx').length > 0;
    },

    render: async function(container, ctx) {
      var blocks = container.querySelectorAll('code.language-xxx');
      if (blocks.length === 0) return;

      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var pre = block.closest('pre');
        if (!pre) continue;
        var code = block.textContent;

        try {
          var wrapper = document.createElement('div');
          wrapper.className = 'xxx-chart';
          wrapper.style.cssText = 'text-align:center;margin:16px 0;';
          wrapper.innerHTML = /* 渲染结果 */;
          pre.parentNode.replaceChild(wrapper, pre);
        } catch (err) {
          ctx.showError(pre, 'Xxx', err.message || String(err));
        }
      }
    }
  });

})();
```

**步骤 2:** 在 `public/manifest.json` 的 `content_scripts[0].js[]` 中注册（添加在 `content.js` 之前）：

```json
"js": [
    "renderers/renderer-registry.js",
    "renderers/render-pipeline.js",
    "...",
    "renderers/renderer-xxx.js",
    "content.js"
]
```

**步骤 3 (如有 CDN 库):** 在 `public/content.js` 的 `CDN_MAPPINGS` 中添加映射，并将 `.min.js` 放入 `public/lib/`：

```javascript
const CDN_MAPPINGS = [
    // ...
    [/xxx@[\d.]+.*xxx\.min\.js/, 'xxx.min.js'],
];
```

### 步骤 1: Web 应用模式 (`src/js/renderers/renderer-xxx.js`)

```javascript
/**
 * Xxx 图表渲染器
 */
import XxxLib from 'xxx';        // npm 包导入
import registry from './renderer-registry.js';

registry.register({
  id: 'xxx',
  name: 'Xxx 图表',
  codeBlockLanguages: ['xxx'],

  detect(container) {
    return container.querySelectorAll('code.language-xxx').length > 0;
  },

  async render(container, ctx) {
    const blocks = container.querySelectorAll('code.language-xxx');
    if (blocks.length === 0) return;

    for (const block of blocks) {
      const pre = block.closest('pre');
      if (!pre) continue;
      const code = block.textContent;

      try {
        const wrapper = document.createElement('div');
        wrapper.className = 'ainote-xxx';
        wrapper.style.cssText = 'text-align:center;margin:16px 0;';
        wrapper.innerHTML = /* 渲染结果 */;
        pre.parentNode.replaceChild(wrapper, pre);
      } catch (err) {
        console.warn('[AINote] Xxx 渲染失败:', err);
        if (ctx.showError) {
          ctx.showError(pre, 'Xxx', err.message || String(err));
        } else {
          pre.classList.add('ainote-render-error');
          pre.innerHTML = `<code>⚠️ Xxx 渲染失败: ${err.message}</code>`;
        }
      }
    }
  },
});
```

**步骤 2:** 安装 npm 包并在 `src/js/main.js` 中导入：

```bash
npm install xxx
```

```javascript
// src/js/main.js
import './renderers/renderer-xxx.js';
```

**步骤 3:** 在 `src/js/parser.js` 的 `DIAGRAM_LANGS` 中添加语言标签：

```javascript
const DIAGRAM_LANGS = [
  'mermaid', 'plantuml', 'uml', 'dot', 'graphviz',
  'd2', 'wave', 'wavedrom', 'nomnoml', 'vega',
  'vega-lite', 'math', 'katex', 'tex',
  'xxx',   // 新增
];
```

**步骤 4:** 在 `src/css/style.css` 中添加对应的 CSS 类：

```css
.ainote-xxx {
  display: flex;
  justify-content: center;
  margin: 16px 0;
  padding: 16px;
  background: var(--bg-code);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow-x: auto;
}
.ainote-xxx svg {
  max-width: 100%;
  height: auto;
}
```

---

## 添加新的文件格式渲染器

文件格式渲染器处理完整文件（如 `.ipynb`、`.csv`、`.json`），替代页面内容。

### 独立渲染器注册接口

```javascript
registry.registerStandalone({
    id: 'xxx',                    // 唯一标识符
    name: '显示名称',              // 如 'JSON 查看器'
    filePattern: '\\.xxx$',       // 匹配文件名的正则表达式
    // 仅用于 Chrome 扩展模式:
    dependencies: ['https://cdn...'],
    cssDependencies: ['https://cdn...'],

    async renderStandalone(rawContent, ctx) {
        // rawContent: 文件原始文本内容
        // ctx: 渲染上下文 (settings, container, fileName, ...)
    }
});
```

### 步骤 1: 扩展模式

与图表渲染器相同：创建 `public/renderers/renderer-xxx.js` 并在 `manifest.json` 中注册。区别是使用 `AINoteRenderers.registerStandalone()`。

扩展的 `content.js` 已内置格式检测（`detectStandaloneFormat()`）和渲染流程（`renderStandaloneFormat()`），无需额外改动。

### 步骤 1: Web 应用模式

```javascript
// src/js/renderers/renderer-xxx.js
import registry from './renderer-registry.js';

registry.registerStandalone({
  id: 'xxx',
  name: 'Xxx 文件',
  filePattern: '\\.xxx$',

  async renderStandalone(rawContent, ctx) {
    // 解析、渲染
    const container = ctx.container || document.body;
    container.innerHTML = /* 渲染后的 HTML */;
  },
});
```

**步骤 2:** 导入到 `src/js/main.js`。

**步骤 3:** 在 `main.js` 的 `FORMAT_MAP` 中添加文件扩展名：

```javascript
const FORMAT_MAP = [
  { ext: /\.md$/i, name: 'Markdown' },
  // ...
  { ext: /\.xxx$/i, name: 'Xxx' },   // 新增
];
```

**步骤 4:** 在 `index.html` 的 `#fileInput` 的 `accept` 属性中添加：

```html
accept="...,.xxx"
```

---

## 代码规范

### Chrome 扩展 (`public/`) 代码规范

- 所有文件使用 IIFE 包裹：`(function() { 'use strict'; ... })();`
- 变量使用 `var` 声明（兼容性考虑）
- 循环使用 `for (var i = 0; i < arr.length; i++)` 风格
- CSS 类名使用 `xxx-chart` 风格
- 库检查使用 `typeof SomeLib === 'undefined'`
- 错误处理：`ctx.showError(pre, 'RendererName', err.message)`
- 每个文件顶部写 `// ========== 标题 ==========`

### Web 应用 (`src/`) 代码规范

- 使用 ES Module：`import` / `export`
- 变量使用 `const` / `let`
- 循环使用 `for...of` 风格
- CSS 类名使用 `ainote-xxx` 风格
- 不需要库存在性检查（npm 导入保证可用）
- 错误处理：检查 `ctx.showError` 是否存在，不存在则使用 `pre.classList.add('ainote-render-error')` 降级
- 每个文件顶部写 `/** 描述 */`

### 通用规范

- **容错优先**: 单个渲染器失败不影响其他渲染器执行
- **SVG 响应式**: 渲染 SVG 后设置 `svg.style.maxWidth = '100%'` 和 `svg.style.height = 'auto'`
- **主题感知**: 渲染输出适配 `ctx.settings.theme` (light / dark)

---

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加 WaveDrom 图表渲染器
fix: 修复编辑器模式二次切换报错
docs: 更新 README 开发指引
refactor: 重构渲染管线调度逻辑
style: 统一代码块样式变量命名
```

分支策略：
- `master` — 稳定发布分支
- `feat/xxx` — 功能开发分支
- `fix/xxx` — 修复分支

---

## 调试技巧

### Web 应用调试

```bash
npm run dev    # 启动开发服务器，浏览器打开 localhost:3000
```

浏览器控制台会输出 `[AINote]` 前缀的日志：
- `[AINote] Shiki 高亮器已加载`
- `[AINote] 渲染完成，成功: mermaid, code, plantuml`
- `[AINote] 部分渲染器失败: graphviz`

### Chrome 扩展调试

1. 加载扩展后，打开任意 `.md` 文件
2. 按 `F12` 打开 DevTools
3. 在 **Console** 中查看 `[AINote]` 日志
4. 在 **Sources** → `Content scripts` 中设置断点调试

### 常见问题

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| 扩展无法加载 | `manifest.json` 格式错误 | 检查 JSON 语法, `content_scripts.js[]` 路径 |
| CDN 库加载失败 | 网络/防火墙限制 | 确保 `public/lib/` 中有本地副本 |
| 渲染器找不到元素 | 代码块语言标签不匹配 | 检查 `DIAGRAM_LANGS` 和 `codeBlockLanguages` |
| 图表不显示 | SVG 尺寸问题 | 添加 `maxWidth: '100%'` 样式 |
| 构建失败 | 导入路径错误 | Web 应用渲染器导入 `'./renderer-registry.js'` |
