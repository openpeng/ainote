// AINote 内容脚本 - 渲染 .md 文件
(function() {
  'use strict';

  let originalContent = null;
  let isRendered = false;
  let settings = {
    autoRender: true,
    theme: 'light',
    fontSize: 16,
    lineNumbers: true
  };

  // ========== 配置加载 ==========
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
    if (isMdFile()) {
      renderMarkdown();
    }
  }

  // ========== MD 文件检测 ==========
  function isMdFile() {
    const url = window.location.href;
    const path = window.location.pathname;

    if (path.endsWith('.md') || path.endsWith('.markdown')) return true;

    if (url.includes('/raw/') && (path.includes('.md') || path.includes('.markdown'))) return true;

    if (url.includes('/blob/')) {
      const readme = document.querySelector('article.markdown-body');
      if (readme) return true;
      const blobContent = document.querySelectorAll('.blob-code-content');
      if (blobContent.length > 0) return true;
    }

    return false;
  }

  // ========== 获取 Markdown 内容 ==========
  function getMarkdownContent() {
    const blobCodes = document.querySelectorAll('.blob-code-content');
    if (blobCodes.length > 0) {
      return Array.from(blobCodes).map(el => el.textContent).join('\n');
    }

    const readme = document.querySelector('article.markdown-body');
    if (readme) {
      return readme.innerText || readme.textContent;
    }

    const glReadme = document.querySelector('.md');
    if (glReadme) {
      return glReadme.innerText || glReadme.textContent;
    }

    const pre = document.querySelector('pre');
    if (pre) {
      return pre.textContent;
    }

    return document.body.innerText;
  }

  // ========== 动态加载资源 ==========
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

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

  // ========== 渲染 Mermaid 图表 ==========
  async function renderMermaidBlocks(container) {
    if (typeof mermaid === 'undefined') return;

    const mermaidBlocks = container.querySelectorAll('code.language-mermaid');
    if (mermaidBlocks.length === 0) return;

    const theme = settings.theme === 'dark' ? 'dark' : 'default';
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'loose'
    });

    let index = 0;
    for (const block of mermaidBlocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;
      const id = `ainote-mermaid-${index++}`;

      try {
        const { svg } = await mermaid.render(id, code);
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-chart';
        wrapper.innerHTML = svg;
        pre.parentNode.replaceChild(wrapper, pre);
      } catch (err) {
        console.warn('AINote Mermaid 渲染失败:', err);
        // 保留原始代码块
      }
    }
  }

  // ========== 渲染 KaTeX 公式 ==========
  function renderMath(container) {
    if (typeof katex === 'undefined') return;

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeValue.match(/\$|\\\(|\\\[/)) {
        textNodes.push(node);
      }
    }

    for (const textNode of textNodes) {
      const parent = textNode.parentNode;
      if (parent.classList && (
        parent.classList.contains('katex') ||
        parent.classList.contains('katex-display') ||
        parent.tagName === 'CODE' ||
        parent.tagName === 'PRE'
      )) continue;

      const text = textNode.nodeValue;
      let newHTML = text;

      // 块级公式 $$...$$
      newHTML = newHTML.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        try {
          return `<span class="katex-formula">${katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })}</span>`;
        } catch (e) {
          return match;
        }
      });

      // 行内公式 $...$
      newHTML = newHTML.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (match, formula) => {
        try {
          return `<span class="katex-formula-inline">${katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })}</span>`;
        } catch (e) {
          return match;
        }
      });

      if (newHTML !== text) {
        const temp = document.createElement('span');
        temp.innerHTML = newHTML;
        parent.replaceChild(temp, textNode);
      }
    }
  }

  // ========== 代码高亮 (Highlight.js) ==========
  async function highlightCodeBlocks(container) {
    // 动态加载 Highlight.js
    if (typeof hljs === 'undefined') {
      await loadCSS('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css');
      await loadCSS('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css');
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/core.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/javascript.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/python.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/css.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/xml.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/bash.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/json.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/typescript.min.js');
    }

    if (typeof hljs === 'undefined') return;

    const theme = settings.theme === 'dark' ? 'github-dark' : 'github';
    // 切换 highlight.js 主题
    const existingLink = document.querySelector('link[href*="highlight.js"]');
    if (existingLink) {
      existingLink.href = `https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/${theme}.min.css`;
    }

    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      // 跳过 mermaid 代码块
      if (block.classList.contains('language-mermaid')) return;
      // 跳过已高亮的
      if (block.classList.contains('hljs')) return;

      try {
        hljs.highlightElement(block);
      } catch (e) {
        // ignore
      }
    });
  }

  // ========== 主渲染函数 ==========
  async function renderMarkdown() {
    if (isRendered) return;

    const mdText = getMarkdownContent();
    if (!mdText) return;

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
      // 动态加载依赖
      const loaders = [];
      if (typeof markdownit === 'undefined') {
        loaders.push(loadScript('https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js'));
      }
      if (typeof mermaid === 'undefined') {
        loaders.push(loadScript('https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js'));
      }
      if (typeof katex === 'undefined') {
        loaders.push(loadCSS('https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css'));
        loaders.push(loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js'));
      }
      await Promise.all(loaders);

      // 初始化 markdown-it
      const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true
      });

      // 渲染 Markdown
      const html = md.render(mdText);

      // 确定主题
      const theme = settings.theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : settings.theme;

      // 创建渲染容器
      const container = document.createElement('div');
      container.id = 'ainote-rendered';
      container.className = `ainote-theme-${theme}`;
      container.style.cssText = `
        max-width: 900px;
        margin: 0 auto;
        padding: 32px;
        font-size: ${settings.fontSize}px;
        line-height: 1.6;
      `;
      container.innerHTML = html;

      // 替换 body 内容
      document.body.innerHTML = '';
      document.body.appendChild(container);

      // 渲染 Mermaid 图表
      await renderMermaidBlocks(container);

      // 渲染 KaTeX 公式
      renderMath(container);

      // 代码高亮
      await highlightCodeBlocks(container);

      isRendered = true;
      addFloatingButton();

    } catch (err) {
      console.error('AINote 渲染失败:', err);
      document.body.innerHTML = originalContent || '';
      alert('AINote 渲染失败: ' + err.message);
    }
  }

  // ========== 应用设置 ==========
  function applySettings() {
    const container = document.getElementById('ainote-rendered');
    if (!container) return;

    const theme = settings.theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme;

    container.className = `ainote-theme-${theme}`;
    container.style.fontSize = settings.fontSize + 'px';

    // 重新高亮代码（切换主题）
    if (typeof hljs !== 'undefined') {
      const themeCSS = settings.theme === 'dark' ? 'github-dark' : 'github';
      const links = document.querySelectorAll('link[href*="highlight.js"]');
      links.forEach(link => {
        if (link.href.includes('styles')) {
          link.href = `https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/${themeCSS}.min.css`;
        }
      });
    }
  }

  // ========== 恢复原始页面 ==========
  function resetPage() {
    if (originalContent) {
      document.body.innerHTML = originalContent;
      isRendered = false;

      if (settings.autoRender && isMdFile()) {
        addFloatingButton();
      }
    }
  }

  // ========== 浮动按钮 ==========
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
      border: none;
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

  // ========== 页面加载检测 ==========
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
