// AINote 内容脚本 - 渲染 .md 文件
(function() {
  'use strict';

  let originalContent = null; // 保存原始内容，用于恢复
  let isRendered = false;
  let settings = {
    autoRender: true,
    theme: 'light',
    fontSize: 16,
    lineNumbers: true
  };

  // 加载配置
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get({
      autoRender: true,
      theme: 'light',
      fontSize: 16,
      lineNumbers: true
    }, (items) => {
      settings = items;
      if (settings.autoRender && isMdFile()) {
        renderMarkdown();
      }
    });

    // 监听配置更新
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'render') {
        renderMarkdown();
        sendResponse({ status: '渲染完成' });
      } else if (message.action === 'reset') {
        resetPage();
        sendResponse({ status: '已恢复原始页面' });
      } else if (message.action === 'updateSettings') {
        settings = { ...settings, ...message.settings };
        if (isRendered) {
          applySettings();
        }
      }
      return true;
    });
  } else {
    // 非插件环境（本地测试）
    if (isMdFile()) {
      renderMarkdown();
    }
  }

  // 判断当前页面是否是 .md 文件
  function isMdFile() {
    const url = window.location.href;
    const path = window.location.pathname;

    // 直接以 .md 或 .markdown 结尾
    if (path.endsWith('.md') || path.endsWith('.markdown')) return true;

    // GitHub/GitLab 的 raw 文件（URL 中包含 .md）
    if (url.includes('/raw/') && (path.includes('.md') || path.includes('.markdown'))) return true;

    // GitHub/GitLab 的 blob 页面
    if (url.includes('/blob/')) {
      // 检测页面是否有 Markdown 特征的 DOM 结构
      const readme = document.querySelector('article.markdown-body'); // GitHub README
      if (readme) return true;

      // 检测是否为纯文本展示（可能是 Markdown）
      const blobContent = document.querySelectorAll('.blob-code-content');
      if (blobContent.length > 0) return true;
    }

    return false;
  }

  // 获取页面 Markdown 内容
  function getMarkdownContent() {
    // GitHub blob 页面
    const blobCodes = document.querySelectorAll('.blob-code-content');
    if (blobCodes.length > 0) {
      return Array.from(blobCodes).map(el => el.textContent).join('\n');
    }

    // GitHub README 页面
    const readme = document.querySelector('article.markdown-body');
    if (readme) {
      return readme.innerText || readme.textContent;
    }

    // GitLab 页面
    const glReadme = document.querySelector('.md');
    if (glReadme) {
      return glReadme.innerText || glReadme.textContent;
    }

    // 原始文本页面（通常是 pre 标签）
    const pre = document.querySelector('pre');
    if (pre) {
      return pre.textContent;
    }

    // 普通页面，获取 body 文本
    return document.body.innerText;
  }

  // 加载外部 JS
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // 加载外部 CSS
  function loadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  // 渲染 Markdown
  async function renderMarkdown() {
    if (isRendered) return;

    const mdText = getMarkdownContent();
    if (!mdText) return;

    // 保存原始内容
    originalContent = document.body.innerHTML;

    // 显示加载提示
    document.body.innerHTML = `
      <div id="ainote-loading" style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: sans-serif;
        color: #666;
      ">
        📝 AINote 正在渲染...
      </div>
    `;

    try {
      // 动态加载 markdown-it
      if (typeof markdownit === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js');
      }

      // 动态加载 Mermaid
      if (typeof mermaid === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js');
      }

      // 动态加载 KaTeX
      if (typeof katex === 'undefined') {
        await loadCSS('https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css');
        await loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js');
      }

      // 初始化 markdown-it
      const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
        highlight: function (str, lang) {
          return `<pre class="code-block"><code class="language-${lang}">${md.utils.escapeHtml(str)}</code></pre>`;
        }
      });

      // 渲染 Markdown
      const html = md.render(mdText);

      // 创建渲染后的页面
      const theme = settings.theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : settings.theme;

      document.body.innerHTML = `
        <div id="ainote-rendered" class="ainote-theme-${theme}" style="
          max-width: 900px;
          margin: 0 auto;
          padding: 32px;
          font-size: ${settings.fontSize}px;
          line-height: 1.6;
        ">
          ${html}
        </div>
      `;

      // 渲染 Mermaid 图表
      if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: true, theme: theme === 'dark' ? 'dark' : 'default' });
      }

      isRendered = true;

      // 添加浮动按钮
      addFloatingButton();

    } catch (err) {
      console.error('AINote 渲染失败:', err);
      document.body.innerHTML = originalContent || '';
      alert('AINote 渲染失败: ' + err.message);
    }
  }

  // 应用设置
  function applySettings() {
    const container = document.getElementById('ainote-rendered');
    if (!container) return;

    const theme = settings.theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme;

    container.className = `ainote-theme-${theme}`;
    container.style.fontSize = settings.fontSize + 'px';
  }

  // 恢复原始页面
  function resetPage() {
    if (originalContent) {
      document.body.innerHTML = originalContent;
      isRendered = false;

      // 重新检测是否需要渲染
      if (settings.autoRender && isMdFile()) {
        addFloatingButton();
      }
    }
  }

  // 添加浮动按钮
  function addFloatingButton() {
    if (document.getElementById('ainote-float-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'ainote-float-btn';
    btn.innerHTML = '📝';
    btn.title = 'AINote 渲染';
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #1a73e8;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 999999;
    `;
    btn.addEventListener('click', () => {
      if (isRendered) {
        resetPage();
      } else {
        renderMarkdown();
      }
    });
    document.body.appendChild(btn);
  }

  // 页面加载完成后检测
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (settings.autoRender && isMdFile()) {
        addFloatingButton();
      }
    });
  } else {
    if (settings.autoRender && isMdFile()) {
      addFloatingButton();
    }
  }
})();
