// AINote 内容脚本 - 渲染 .md 文件
(function() {
  'use strict';

  let originalContent = null;
  let isRendered = false;
  let currentMarkdownText = ''; // 保存当前 Markdown 文本（用于编辑器模式）
  let settings = {
    autoRender: true,
    theme: 'light',
    fontSize: 16,
    lineNumbers: true,
    editorMode: false
  };

  // ========== 配置加载 ==========
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get({
      autoRender: true,
      theme: 'light',
      fontSize: 16,
      lineNumbers: true,
      editorMode: false
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
      } else if (message.action === 'exportPDF') {
        exportToPDF();
        sendResponse({ status: '正在导出 PDF...' });
      } else if (message.action === 'toggleEditor') {
        toggleEditorMode();
        sendResponse({ status: settings.editorMode ? '已进入编辑器模式' : '已退出编辑器模式' });
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

  // ========== 渲染 KaTeX 公式（简化版，避免正则问题） ==========
  function renderMath(container) {
    if (typeof katex === 'undefined') return;

    // 找到所有文本节点，使用更安全的方法
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentNode;
          if (parent.classList) {
            if (parent.classList.contains('katex') ||
                parent.classList.contains('katex-display') ||
                parent.tagName === 'CODE' ||
                parent.tagName === 'PRE') {
              return NodeFilter.FILTER_REJECT;
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeValue.includes('$')) {
        textNodes.push(node);
      }
    }

    // 逆序遍历，避免节点替换时影响遍历
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const textNode = textNodes[i];
      const parent = textNode.parentNode;
      const text = textNode.nodeValue;

      // 简单的公式检测：找到 $...$ 或 $$...$$
      // 先处理块级公式 $$...$$
      let newHTML = text;

      // 块级公式 $$...$$ (独占一行或前后有换行)
      newHTML = newHTML.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        try {
          return '<span class="katex-formula">' +
                 katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }) +
                 '</span>';
        } catch (e) {
          return match;
        }
      });

      // 行内公式 $...$ (不包含换行，且前面不是 \)
      // 使用更兼容的方法：不匹配 \$
      const inlineFormulaRegex = /(^|[^\\])\$([^\$\n]+?)\$/g;
      newHTML = newHTML.replace(inlineFormulaRegex, (match, prefix, formula) => {
        try {
          return prefix + '<span class="katex-formula-inline">' +
                 katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false }) +
                 '</span>';
        } catch (e) {
          return match;
        }
      });

      // 恢复 \$ 为 $
      newHTML = newHTML.replace(/\\\$/g, '$');

      if (newHTML !== text) {
        const temp = document.createElement('span');
        temp.innerHTML = newHTML;
        parent.replaceChild(temp, textNode);
      }
    }
  }

  // ========== 代码高亮 (Highlight.js) ==========
  let hljsLoaded = false;
  let currentHljsTheme = null;

  async function loadHighlightJS(theme) {
    const themeName = theme === 'dark' ? 'github-dark' : 'github';

    if (typeof hljs === 'undefined') {
      // 加载核心
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/core.min.js');

      // 加载常用语言
      const languages = ['javascript', 'python', 'css', 'xml', 'bash', 'json', 'typescript', 'java', 'cpp', 'c', 'go', 'rust', 'sql', 'yaml', 'markdown'];
      for (const lang of languages) {
        try {
          await loadScript(`https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/${lang}.min.js`);
        } catch (e) {
          // 忽略加载失败的语言
        }
      }

      hljsLoaded = true;
    }

    // 加载或切换主题 CSS
    if (!currentHljsTheme || currentHljsTheme !== themeName) {
      // 移除旧的主题 CSS
      const oldLinks = document.querySelectorAll('link[data-hljs-theme]');
      oldLinks.forEach(link => link.remove());

      // 加载新主题
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/${themeName}.min.css`;
      link.setAttribute('data-hljs-theme', themeName);
      document.head.appendChild(link);

      currentHljsTheme = themeName;
    }
  }

  async function highlightCodeBlocks(container) {
    const theme = settings.theme === 'dark' ? 'dark' : 'light';
    await loadHighlightJS(theme);

    if (typeof hljs === 'undefined') return;

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

    currentMarkdownText = mdText;
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
    if (isRendered && typeof hljs !== 'undefined') {
      loadHighlightJS(theme).then(() => {
        const codeBlocks = container.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
          if (block.classList.contains('language-mermaid')) return;
          // 移除旧的 hljs 类，重新高亮
          block.classList.remove('hljs', 'hljs-*');
          try {
            hljs.highlightElement(block);
          } catch (e) {
            // ignore
          }
        });
      });
    }
  }

  // ========== 恢复原始页面 ==========
  function resetPage() {
    if (originalContent) {
      document.body.innerHTML = originalContent;
      isRendered = false;
      currentMarkdownText = '';

      if (settings.autoRender && isMdFile()) {
        addFloatingButton();
      }
    }
  }

  // ========== 导出 PDF ==========
  function exportToPDF() {
    if (!isRendered) {
      alert('请先渲染 Markdown 内容');
      return;
    }

    // 添加打印样式
    const style = document.createElement('style');
    style.id = 'ainote-print-style';
    style.textContent = `
      @media print {
        #ainote-float-btn, .ainote-editor-toolbar { display: none !important; }
        #ainote-rendered {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 20px !important;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    // 打印后移除样式
    setTimeout(() => {
      const printStyle = document.getElementById('ainote-print-style');
      if (printStyle) printStyle.remove();
    }, 1000);
  }

  // ========== 编辑器模式 ==========
  function toggleEditorMode() {
    if (!isRendered) {
      alert('请先渲染 Markdown 内容');
      return;
    }

    settings.editorMode = !settings.editorMode;

    if (settings.editorMode) {
      enterEditorMode();
    } else {
      exitEditorMode();
    }

    // 保存设置
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ editorMode: settings.editorMode });
    }
  }

  function enterEditorMode() {
    const container = document.getElementById('ainote-rendered');
    if (!container) return;

    // 创建编辑器布局
    const wrapper = document.createElement('div');
    wrapper.id = 'ainote-editor-wrapper';
    wrapper.style.cssText = `
      display: flex;
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    `;

    // 编辑器面板
    const editorPanel = document.createElement('div');
    editorPanel.id = 'ainote-editor-panel';
    editorPanel.style.cssText = `
      flex: 1;
      min-width: 0;
    `;

    const textarea = document.createElement('textarea');
    textarea.id = 'ainote-editor-textarea';
    textarea.value = currentMarkdownText;
    textarea.style.cssText = `
      width: 100%;
      height: 80vh;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 14px;
      line-height: 1.5;
      resize: vertical;
    `;
    if (settings.theme === 'dark') {
      textarea.style.background = '#161b22';
      textarea.style.color = '#c9d1d9';
      textarea.style.borderColor = '#30363d';
    }

    // 实时预览
    let previewTimer = null;
    textarea.addEventListener('input', () => {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        currentMarkdownText = textarea.value;
        updatePreview(textarea.value);
      }, 500);
    });

    editorPanel.appendChild(textarea);

    // 预览面板
    const previewPanel = document.createElement('div');
    previewPanel.id = 'ainote-preview-panel';
    previewPanel.style.cssText = `
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      max-height: 80vh;
    `;

    wrapper.appendChild(editorPanel);
    wrapper.appendChild(previewPanel);

    // 替换容器内容
    container.parentNode.replaceChild(wrapper, container);

    // 初始预览
    updatePreview(currentMarkdownText);
  }

  function exitEditorMode() {
    const wrapper = document.getElementById('ainote-editor-wrapper');
    if (!wrapper) return;

    // 重新渲染完整页面
    renderMarkdown();
  }

  function updatePreview(mdText) {
    if (typeof markdownit === 'undefined') return;

    const previewPanel = document.getElementById('ainote-preview-panel');
    if (!previewPanel) return;

    const md = window.markdownit({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true
    });

    const html = md.render(mdText);
    previewPanel.innerHTML = html;

    // 高亮代码
    if (typeof hljs !== 'undefined') {
      const codeBlocks = previewPanel.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        if (block.classList.contains('language-mermaid')) return;
        try {
          hljs.highlightElement(block);
        } catch (e) {
          // ignore
        }
      });
    }

    // 渲染 Mermaid
    renderMermaidBlocks(previewPanel);

    // 渲染公式
    renderMath(previewPanel);
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

  // ========== 键盘快捷键 ==========
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+R: 渲染/重置
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      if (isRendered) {
        resetPage();
      } else {
        renderMarkdown();
      }
    }

    // Ctrl+Shift+E: 切换编辑器模式
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      toggleEditorMode();
    }

    // Ctrl+Shift+P: 导出 PDF
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      exportToPDF();
    }
  });

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
