/**
 * main.js - AINote 主入口
 * 负责：文件读取、Markdown 渲染、管道编排、主题切换、设置管理
 */
import createParser, { renderMarkdown } from './parser.js';
import { createHighlighter } from 'shiki';
import settings from './settings.js';
import registry from './renderers/renderer-registry.js';
import pipeline from './renderers/render-pipeline.js';
import { initToolbar } from './components/toolbar.js';
import { initSettingsPanel, toggleSettingsPanel } from './components/settings-panel.js';

// 导入所有渲染器（触发注册）
import './renderers/renderer-mermaid.js';
import './renderers/renderer-plantuml.js';
import './renderers/renderer-graphviz.js';
import './renderers/renderer-d2.js';
import './renderers/renderer-wavedrom.js';
import './renderers/renderer-nomnoml.js';
import './renderers/renderer-vega.js';
import './renderers/renderer-code.js';
import './renderers/renderer-json.js';
import './renderers/renderer-csv.js';
import './renderers/renderer-ipynb.js';
import './renderers/renderer-geojson.js';
import './renderers/renderer-adoc.js';

// ========== 状态 ==========
let parser = null;
let shikiHighlighter = null;

// ========== 辅助函数 ==========
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showRenderError(pre, langClass, errorMsg) {
  const code = pre.querySelector('code')?.textContent || '';
  const isDark = settings.get('theme') === 'dark';
  const wrapper = document.createElement('div');
  wrapper.className = 'ainote-render-error';
  wrapper.style.cssText = `
    margin:16px 0;border:1px solid #d73a49;border-radius:8px;overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  `;
  wrapper.innerHTML = `
    <div style="background:#d73a49;color:#fff;padding:8px 16px;font-size:13px;font-weight:600;">
      ⚠️ ${langClass} 渲染失败</div>
    <div style="padding:12px 16px;background:${isDark ? '#1b1b2f' : '#fff8f5'};color:${isDark ? '#e1e4e8' : '#24292f'};font-size:13px;">
      <div style="margin-bottom:12px;">${escapeHtml(errorMsg)}</div>
      <details style="cursor:pointer;">
        <summary style="color:${isDark ? '#8b949e' : '#586069'};">查看原始代码</summary>
        <pre style="background:${isDark ? '#0d1117' : '#f6f8fa'};padding:12px;border-radius:6px;overflow:auto;max-height:300px;margin:0;">
          <code>${escapeHtml(code)}</code></pre>
      </details>
    </div>`;
  pre.parentNode.replaceChild(wrapper, pre);
}

function createRenderContext() {
  return {
    settings: settings.getAll(),
    escapeHtml,
    showError: showRenderError,
    shikiHighlighter,
    container: document.getElementById('markdown-body'),
    getPlantUmlServerList() {
      const servers = ['https://www.plantuml.com/plantuml'];
      const custom = settings.get('plantUmlCustomServer');
      if (custom) servers.push(custom.replace(/\/+$/, ''));
      return [...new Set(servers)];
    },
  };
}

// ========== 初始化 Shiki ==========
async function initShiki() {
  try {
    shikiHighlighter = await createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        'javascript', 'typescript', 'python', 'java', 'c', 'cpp',
        'go', 'rust', 'html', 'css', 'json', 'yaml', 'markdown',
        'bash', 'sql', 'xml', 'shell',
      ],
    });
    console.log('[AINote] Shiki 高亮器已加载');
  } catch (e) {
    console.warn('[AINote] Shiki 加载失败:', e.message);
  }
}

// ========== 初始化 Markdown 解析器 ==========
function initParser() {
  parser = createParser(shikiHighlighter);
  console.log('[AINote] Markdown 解析器已初始化');
}

// ========== 文件类型检测 ==========
const FORMAT_MAP = [
  { ext: /\.md$/i, name: 'Markdown' },
  { ext: /\.markdown$/i, name: 'Markdown' },
  { ext: /\.json$/i, name: 'JSON' },
  { ext: /\.csv$/i, name: 'CSV' },
  { ext: /\.tsv$/i, name: 'TSV' },
  { ext: /\.ipynb$/i, name: 'IPYNB' },
  { ext: /\.geojson$/i, name: 'GeoJSON' },
  { ext: /\.topojson$/i, name: 'GeoJSON' },
  { ext: /\.adoc$/i, name: 'AsciiDoc' },
  { ext: /\.asciidoc$/i, name: 'AsciiDoc' },
];

function detectFileFormat(fileName) {
  for (const fmt of FORMAT_MAP) {
    if (fmt.ext.test(fileName)) return fmt;
  }
  return { ext: null, name: 'Markdown' };
}

// ========== 渲染内容 ==========
async function renderContent(text, fileName = '') {
  if (!parser) initParser();

  const format = detectFileFormat(fileName);
  const container = document.getElementById('markdown-body');
  const ctx = createRenderContext();
  ctx.fileName = fileName;

  // 检查是否匹配独立格式渲染器
  const standaloneRenderer = registry.getForFile(fileName);
  if (standaloneRenderer) {
    try {
      await standaloneRenderer.renderStandalone(text, ctx);
      console.log(`[AINote] ${format.name} 渲染完成`);
      return;
    } catch (e) {
      console.error(`[AINote] ${format.name} 渲染失败:`, e);
      container.innerHTML = `<div class="ainote-error">⚠️ 渲染失败: ${escapeHtml(e.message)}</div>`;
      return;
    }
  }

  // Markdown 渲染
  const html = renderMarkdown(parser, text);
  container.innerHTML = html;
  container.dataset.rawMarkdown = text;

  // 运行渲染管道
  const result = await pipeline.run(container, ctx);

  // 代码块添加复制按钮
  addCopyButtons();

  // 生成目录
  generateTOC();

  if (result.failed.length > 0) {
    console.warn('[AINote] 部分渲染器失败:', result.failed.join(', '));
  }
  console.log('[AINote] 渲染完成，成功:', result.success.join(', '));
}

// ========== 滚动监听（高亮当前章节）==========
let scrollSpyObserver = null;

function initScrollSpy() {
  if (scrollSpyObserver) scrollSpyObserver.disconnect();

  const tocLinks = document.querySelectorAll('#toc a[data-target]');
  const headings = document.querySelectorAll('#markdown-body h1[id], #markdown-body h2[id], #markdown-body h3[id]');

  // 点击跳转 + 平滑滚动
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('data-target'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // IntersectionObserver 滚动监听
  scrollSpyObserver = new IntersectionObserver((entries) => {
    let activeId = null;
    for (const entry of entries) {
      if (entry.isIntersecting) {
        activeId = `#${entry.target.id}`;
      }
    }
    // 没找到当前可见标题时，取最后一个已滚过的
    if (!activeId) {
      for (const entry of entries) {
        if (entry.boundingClientRect.top <= 100) {
          activeId = `#${entry.target.id}`;
        }
      }
    }
    if (activeId) {
      tocLinks.forEach(link => {
        const isActive = link.getAttribute('data-target') === activeId;
        link.classList.toggle('toc-active', isActive);
      });
    }
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

  headings.forEach(h => scrollSpyObserver.observe(h));
}
function generateTOC() {
  const tocContainer = document.getElementById('toc');
  const headings = document.querySelectorAll('#markdown-body h1, #markdown-body h2, #markdown-body h3');
  if (!headings.length) {
    tocContainer.innerHTML = '<p class="toc-empty">打开文件后显示目录</p>';
    return;
  }

  let tocHTML = '';
  const stack = []; // 追踪嵌套层级

  headings.forEach((h, idx) => {
    const level = parseInt(h.tagName[1]);
    h.id = `heading-${idx}`;
    const text = h.textContent;

    // 关闭更深或同级之前的标签
    while (stack.length > 0 && stack[stack.length - 1] >= level) {
      if (stack.pop() >= level) {
        tocHTML += '</li></ul>';
      }
    }

    // 如果当前层级更深，开启新子列表
    if (stack.length === 0 || stack[stack.length - 1] < level) {
      tocHTML += '<ul class="toc-tree">';
      stack.push(level);
    }

    tocHTML += `<li class="toc-item toc-level-${level}">
      <a href="#heading-${idx}" data-target="#heading-${idx}">${text}</a>`;
  });

  // 关闭所有未关闭的标签
  while (stack.length > 0) {
    stack.pop();
    tocHTML += '</li></ul>';
  }

  tocContainer.innerHTML = tocHTML;
  initScrollSpy();
}

// ========== 代码块复制按钮 ==========
function addCopyButtons() {
  const codes = document.querySelectorAll('#markdown-body pre');
  codes.forEach(pre => {
    if (pre.querySelector('.copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = '📋 复制';
    btn.onclick = () => {
      const code = pre.querySelector('code') || pre;
      navigator.clipboard.writeText(code.textContent).then(() => {
        btn.textContent = '✅ 已复制';
        setTimeout(() => (btn.textContent = '📋 复制'), 2000);
      });
    };
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

// ========== 主题管理 ==========
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggleEl = document.getElementById('themeToggle');
  if (toggleEl) {
    toggleEl.textContent = theme === 'dark' ? '☀️' : '🌓';
  }

  // 重新渲染 Mermaid（主题相关）
  const content = document.getElementById('markdown-body');
  if (content && content.dataset.rawMarkdown) {
    renderContent(content.dataset.rawMarkdown);
  }
}

function toggleTheme() {
  const current = settings.get('theme');
  const next = current === 'dark' ? 'light' : 'dark';
  settings.set('theme', next);
  applyTheme(next);
}

// ========== 文件读取 ==========
function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    renderContent(text, file.name);
  };
  reader.readAsText(file, 'UTF-8');
}

// ========== 示例 Markdown ==========
const DEMO_MARKDOWN = `# 📖 AINote Markdown 阅读器

欢迎使用 **AINote** —— 一款功能丰富的文件阅读器，支持多种图表和文件格式！

## ✨ 功能特性

- ✅ Mermaid / PlantUML / Graphviz / D2 图表
- ✅ WaveDrom / Nomnoml / Vega 数据可视化
- ✅ KaTeX 数学公式
- ✅ Shiki 代码高亮
- ✅ JSON / CSV / IPYNB / GeoJSON / AsciiDoc 文件支持
- ✅ 编辑器模式（分屏实时预览）
- ✅ 多种主题切换
- ✅ PDF 导出

---

## 📊 Mermaid 流程图示例

\`\`\`mermaid
graph TD
    A[打开文件] --> B{文件类型}
    B -->|Markdown| C[Markdown 解析]
    B -->|CSV| D[表格渲染]
    B -->|GeoJSON| E[地图渲染]
    C --> F[图表渲染]
    D --> G[最终展示]
    E --> G
    F --> G
\`\`\`

## 📈 Mermaid 时序图

\`\`\`mermaid
sequenceDiagram
    participant U as 用户
    participant A as AINote
    participant R as 渲染器
    U->>A: 打开文件
    A->>R: 管道渲染
    R-->>A: 渲染结果
    A->>U: 展示页面
\`\`\`

## 🔢 数学公式

行内公式：$E = mc^2$

块级公式：
$$
\\frac{\\partial f}{\\partial t} = \\alpha \\nabla^2 f
$$

## 💻 代码高亮

\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`);
  return { status: 'ok', name };
}
\`\`\`

## 📋 任务列表

- [x] 集成图表渲染器
- [x] 支持多文件格式
- [x] 编辑器模式
- [ ] 云端同步

---

> 🎉 点击上方按钮或拖放文件开始体验！
`;

// ========== 初始化 ==========
async function init() {
  // 1. 加载 Shiki
  await initShiki();

  // 2. 初始化解析器
  initParser();

  // 3. 初始化设置面板
  initSettingsPanel();

  // 4. 恢复主题
  const savedTheme = settings.get('theme') || 'light';
  applyTheme(savedTheme);

  // 5. 监听设置变更
  settings.onChange((change) => {
    if (change.key === 'theme' || 'theme' in change) {
      applyTheme(settings.get('theme'));
    }
  });

  // 6. 初始化工具栏
  initToolbar({
    onRender: () => {
      const content = document.getElementById('markdown-body');
      if (content && content.dataset.rawMarkdown) {
        renderContent(content.dataset.rawMarkdown);
      }
    },
    onSettings: toggleSettingsPanel,
    shikiHighlighter,
    createContext: createRenderContext,
  });

  // 7. 绑定事件
  document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // 8. 拖放文件支持
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // 9. 渲染示例内容
  const body = document.getElementById('markdown-body');
  body.dataset.rawMarkdown = DEMO_MARKDOWN;
  await renderContent(DEMO_MARKDOWN, 'demo.md');

  console.log('[AINote] 初始化完成');
}

init();
