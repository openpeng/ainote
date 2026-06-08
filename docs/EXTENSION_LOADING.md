# AINote 浏览器插件 - 加载说明

## 安装到 Chrome/Edge

### 步骤 1：打开扩展管理页面
- **Chrome**: 地址栏输入 `chrome://extensions/`
- **Edge**: 地址栏输入 `edge://extensions/`

### 步骤 2：启用开发者模式
- 右上角打开 **"开发者模式"** 开关

### 步骤 3：加载插件
- 点击 **"加载已解压的扩展程序"**
- 选择目录：`D:\mycode\ainote\public`
- 插件应出现在列表中，且状态为 **"已启用"**

### 步骤 4：测试插件
1. 打开任意 `.md` 文件（如 GitHub 上的 README.md）
2. 插件应自动渲染 Markdown 内容
3. 点击插件图标，打开设置面板，可以：
   - 开关自动渲染
   - 选择主题（亮色/暗色/跟随系统）
   - 调整字体大小
   - 手动触发渲染 / 恢复原始页面

## 功能说明

### 自动渲染
- 当访问 `.md` 文件时，插件会自动检测并渲染
- 支持 GitHub、GitLab 等代码托管平台的 blob/raw 页面

### 手动渲染
- 点击页面右下角的浮动按钮（📝）
- 或点击插件图标，在弹出面板中点击 **"手动渲染当前页面"**

### 设置
- **自动渲染 .md 文件**: 开关自动检测
- **主题**: 亮色/暗色/跟随系统
- **字体大小**: 拖动滑块调整
- **显示行号**: 开关代码行号

## 常见问题

### 插件加载后没有反应？
- 确保访问的是 `.md` 文件或包含 Markdown 内容的页面
- 检查插件是否已启用
- 打开浏览器控制台（F12），查看是否有错误信息

### Mermaid 图表没有渲染？
- 确保网络连接正常（需要加载 CDN 资源）
- 检查控制台是否有 `mermaid` 相关错误

### KaTeX 公式没有渲染？
- 确保 Markdown 中使用正确的公式语法（`$...$` 或 `$$...$$`）
- 检查控制台是否有 `katex` 相关错误

## 开发模式

### 修改插件代码后
1. 修改 `public/` 目录下的文件
2. 在扩展管理页面，点击插件的 **"重新加载"** 按钮
3. 刷新测试页面

### 调试
- 右键点击插件图标 → **"检查弹出窗口"**（调试 popup）
- 在测试页面按 F12 → **"控制台"**（查看 content script 日志）
- 在扩展管理页面，点击插件的 **"服务工作进程"**（调试 background.js）

## 文件结构

```
public/
├── manifest.json       # 插件配置
├── background.js       # 后台脚本
├── content.js         # 内容脚本（核心渲染逻辑）
├── popup.html         # 弹出面板 HTML
├── popup.js           # 弹出面板 JS
├── icon16.svg         # 16x16 图标
├── icon48.svg         # 48x48 图标
├── icon128.svg        # 128x128 图标
└── styles/
    ├── content.css    # 内容样式
    └── popup.css      # 弹出面板样式
```

## CDN 依赖

插件使用以下 CDN 资源（需要网络连接）：
- `markdown-it`: `https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js`
- `mermaid`: `https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js`
- `katex`: `https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js` 和 `katex.min.css`

## 卸载插件

在扩展管理页面，点击插件的 **"移除"** 按钮。
