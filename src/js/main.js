/**
 * main.js - AINote 主入口
 * 负责：文件读取、Markdown 渲染、Mermaid 渲染、主题切换、目录生成
 */
import createParser, { renderMarkdown } from './parser.js';

// ========== 状态 ==========
let parser = null;
let shikiHighlighter = null;
let currentTheme = 'light';

// ========== 初始化 Shiki ==========
async function initShiki() {
  try {
    // 动态导入 Shiki（ESM 包）
    const { getHighlighter } = await import(
      '/node_modules/shiki/dist/index.mjs'
    );
    shikiHighlighter = await getHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        'javascript', 'typescript', 'python', 'java', 'c', 'cpp',
        'go', 'rust', 'html', 'css', 'json', 'yaml', 'markdown',
        'bash', 'sql', 'xml', 'shell',
      ],
    });
    console.log('[AINote] Shiki 高亮器已加载');
  } catch (e) {
    console.warn('[AINote] Shiki 加载失败，将使用默认高亮:', e.message);
  }
}

// ========== 初始化 Markdown 解析器 ==========
function initParser() {
  parser = createParser(shikiHighlighter);
  console.log('[AINote] Markdown 解析器已初始化');
}

// ========== 渲染 Markdown ==========
async function renderContent(markdownText) {
  if (!parser) initParser();

  // 1. Markdown → HTML
  const html = renderMarkdown(parser, markdownText);
  const container = document.getElementById('markdown-body');
  container.innerHTML = html;

  // 2. 渲染 Mermaid 图表
  renderMermaid();

  // 3. 渲染数学公式（KaTeX 自动处理 class="katex" 的元素）
  renderMath();

  // 4. 生成目录
  generateTOC();

  // 5. 代码块添加复制按钮
  addCopyButtons();

  console.log('[AINote] 渲染完成');
}

// ========== Mermaid 渲染 ==========
function renderMermaid() {
  const mermaidBlocks = document.querySelectorAll('pre.mermaid');
  if (!mermaidBlocks.length) return;

  if (typeof mermaid === 'undefined') {
    console.warn('[AINote] Mermaid JS 未加载');
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: currentTheme === 'dark' ? 'dark' : 'default',
    securityLevel: 'loose',
  });

  mermaidBlocks.forEach(async (block, idx) => {
    const code = block.textContent;
    const id = `mermaid-svg-${idx}`;
    try {
      const { svg } = await mermaid.render(id, code);
      block.outerHTML = `<div class="mermaid-svg">${svg}</div>`;
    } catch (e) {
      console.warn('[AINote] Mermaid 渲染失败:', e);
      block.outerHTML = `<pre class="mermaid-error">Mermaid 渲染错误:\n${code}</pre>`;
    }
  });
}

// ========== 数学公式渲染（KaTeX 自动处理）==========
function renderMath() {
  // markdown-it-katex 已把公式转为 KaTeX 的 HTML，
  // KaTeX 会自动渲染页面中的 .katex 元素
  // 如果没有自动渲染，可以手动调用 renderMathInElement
  if (window.renderMathInElement) {
    window.renderMathInElement(document.getElementById('markdown-body'), {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
    });
  }
}

// ========== 生成目录 ==========
function generateTOC() {
  const tocContainer = document.getElementById('toc');
  const headings = document.querySelectorAll('#markdown-body h1, #markdown-body h2, #markdown-body h3');
  if (!headings.length) {
    tocContainer.innerHTML = '<p class="toc-empty">打开文件后显示目录</p>';
    return;
  }

  let tocHTML = '<ul class="toc-list">';
  headings.forEach((h, idx) => {
    const level = parseInt(h.tagName[1]);
    const text = h.textContent;
    const id = `heading-${idx}`;
    h.id = id;
    const indent = (level - 1) * 16;
    tocHTML += `<li style="padding-left:${indent}px"><a href="#${id}">${text}</a></li>`;
  });
  tocHTML += '</ul>';
  tocContainer.innerHTML = tocHTML;
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

// ========== 主题切换 ==========
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.getElementById('themeToggle').textContent =
    currentTheme === 'light' ? '🌓' : '☀️';
  localStorage.setItem('ainote-theme', currentTheme);

  // 重新渲染 Mermaid（切换主题）
  const content = document.getElementById('markdown-body');
  if (content.dataset.rawMarkdown) {
    renderContent(content.dataset.rawMarkdown);
  }
}

// ========== 文件读取 ==========
function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    document.getElementById('markdown-body').dataset.rawMarkdown = text;
    renderContent(text);
  };
  reader.readAsText(file, 'UTF-8');
}

// ========== 示例 Markdown（首次打开无文件时展示）==========
const DEMO_MARKDOWN = `\
# 📖 AINote Markdown 阅读器

欢迎使用 **AINote** —— 一款支持丰富插件的 Markdown 阅读器！

## ✨ 功能特性

- ✅ Mermaid 图表渲染
- ✅ PlantUML 图表
- ✅ KaTeX 数学公式
- ✅ Shiki 代码高亮
- ✅ 目录自动生成
- ✅ 暗色/亮色主题切换
- ✅ 代码块一键复制

## 📊 Mermaid 流程图示例

\`\`\`mermaid
graph TD
    A[打开 Markdown 文件] --> B{解析引擎}
    B --> C[markdown-it]
    C --> D[HTML 渲染]
    D --> E[图表渲染]
    E --> F[Mermaid/PlantUML]
    D --> G[数学公式 KaTeX]
    D --> H[代码高亮 Shiki]
    F & G & H --> I[最终展示]
\`\`\`

## 🔢 数学公式示例

行内公式：爱因斯坦的质能方程 $E = mc^2$ 是物理学中最著名的公式之一。

块级公式：

$$
\\frac{\\partial f}{\\partial t} = \\alpha \\nabla^2 f
$$

## 💻 代码高亮示例

\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`);
  return { status: 'ok', name };
}
\`\`\`

## 📋 任务列表

- [x] 集成 markdown-it 核心插件
- [x] 支持 Mermaid 图表
- [ ] 支持 PlantUML 图表
- [ ] 导出 PDF 功能
- [ ] 多标签页支持

## 📝 脚注示例

这是一个带有脚注的句子[^1]。

[^1]: 这是脚注的内容。

---

> 🎉 点击下方按钮打开你的 Markdown 文件开始体验！
`;

// ========== 初始化 ==========
async function init() {
  // 1. 加载 Shiki
  await initShiki();

  // 2. 初始化解析器
  initParser();

  // 3. 恢复主题
  const savedTheme = localStorage.getItem('ainote-theme') || 'light';
  currentTheme = savedTheme;
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.getElementById('themeToggle').textContent =
    currentTheme === 'light' ? '🌓' : '☀️';

  // 4. 绑定事件
  document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // 5. 拖放文件支持
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // 6. 渲染示例内容
  document.getElementById('markdown-body').dataset.rawMarkdown = DEMO_MARKDOWN;
  await renderContent(DEMO_MARKDOWN);

  console.log('[AINote] 初始化完成 🎉');
}

init();
