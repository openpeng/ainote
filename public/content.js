// AINote 内容脚本 - 编排器
// 负责: 文件检测、配置管理、工具栏、快捷键、编辑器模式
// 渲染逻辑已拆分到 renderers/ 目录下的独立插件中
(function() {
  'use strict';

  // ========== 获取当前 Tab ID ==========
  let _tabIdPromise = null;
  function getTabId() {
    if (!_tabIdPromise) {
      _tabIdPromise = new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ action: 'getTabId' }, (response) => {
            resolve(response?.tabId || null);
          });
        } else {
          resolve(null);
        }
      });
    }
    return _tabIdPromise;
  }

  // ========== 辅助函数 ==========
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  let originalContent = null;
  let isRendered = false;
  let currentMarkdownText = ''; // 保存当前 Markdown 文本（用于编辑器模式）
  let settings = {
    autoRender: true,
    theme: 'light',
    fontSize: 16,
    lineNumbers: true,
    editorMode: false,
    // PlantUML 服务器配置
    plantUmlServer: 'auto',
    plantUmlCustomServer: ''
  };

  // PlantUML 服务器列表
  const PLANTUML_SERVERS = {
    official: 'https://www.plantuml.com/plantuml',
    mirror_cn: ''
  };

  // 根据设置获取待尝试的服务器列表
  function getPlantUmlServerList() {
    const servers = [];
    switch (settings.plantUmlServer) {
      case 'official':
        servers.push(PLANTUML_SERVERS.official);
        break;
      case 'custom':
        if (settings.plantUmlCustomServer) {
          servers.push(settings.plantUmlCustomServer.replace(/\/+$/, ''));
        }
        servers.push(PLANTUML_SERVERS.official);
        break;
      case 'auto':
      default:
        servers.push(PLANTUML_SERVERS.official);
        if (settings.plantUmlCustomServer) {
          servers.push(settings.plantUmlCustomServer.replace(/\/+$/, ''));
        }
        break;
    }
    return [...new Set(servers)];
  }

  // ========== 配置加载 ==========
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get({
      autoRender: true,
      theme: 'light',
      fontSize: 16,
      lineNumbers: true,
      editorMode: false
    }, (items) => {
      settings = { ...settings, ...items };
      if (isMdFile()) {
        addToolbar();
      } else if (isDrawioFile()) {
        renderDrawio();
      } else if (detectStandaloneFormat()) {
        addStandaloneToolbar();
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'render') {
        if (isDrawioFile()) {
          renderDrawio();
        } else if (detectStandaloneFormat()) {
          renderStandaloneFormat();
        } else {
          renderMarkdown();
        }
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
    } else if (detectStandaloneFormat()) {
      renderStandaloneFormat();
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

  // ========== 独立文件格式检测 ==========
  // 通过渲染器注册表中的 filePattern 匹配当前 URL
  let _standaloneRenderer = null;
  function detectStandaloneFormat() {
    if (_standaloneRenderer) return _standaloneRenderer;
    _standaloneRenderer = AINoteRenderers.getForFile(window.location.pathname);
    return _standaloneRenderer;
  }

  function getStandaloneContent() {
    const preEl = document.querySelector('pre');
    if (preEl) return preEl.textContent || '';
    return document.body.innerText || '';
  }

  // ========== 独立文件格式渲染 ==========
  async function renderStandaloneFormat() {
    if (isRendered) return;
    const renderer = detectStandaloneFormat();
    if (!renderer) return;

    const rawContent = getStandaloneContent();
    if (!rawContent) return;

    originalContent = document.body.innerHTML;

    // 显示加载提示
    document.body.innerHTML = `
      <div id="ainote-loading" style="
        display: flex; justify-content: center; align-items: center;
        height: 100vh; font-family: sans-serif; color: #666;
      ">📦 AINote 正在渲染 ${renderer.name}...</div>
    `;

    try {
      // 加载渲染器依赖
      const ctx = createRenderContext();
      const deps = renderer.dependencies || [];
      const cssDeps = renderer.cssDependencies || [];

      // 并行加载 CSS 和 JS
      await Promise.all(cssDeps.map(href =>
        loadCSS(href).catch(e => console.warn('CSS 加载失败:', href, e))
      ));
      await Promise.all(deps.map(src =>
        loadScript(src).catch(e => console.warn('JS 加载失败:', src, e))
      ));

      // 调用渲染器的 renderStandalone 方法
      if (typeof renderer.renderStandalone === 'function') {
        await renderer.renderStandalone(rawContent, ctx);
      } else {
        throw new Error('渲染器缺少 renderStandalone 方法');
      }

      isRendered = true;
      updateToolbarState();

    } catch (err) {
      console.error('AINote 独立格式渲染失败:', err);
      document.body.innerHTML = originalContent || '';
      alert(`AINote 渲染失败: ${err.message}`);
    }
  }

  // ========== 独立文件格式工具栏 ==========
  function addStandaloneToolbar() {
    if (document.getElementById('ainote-toolbar')) return;

    const renderer = detectStandaloneFormat();
    const name = renderer ? renderer.name : '文件';

    const bar = document.createElement('div');
    bar.id = 'ainote-toolbar';
    bar.style.cssText = 'position:fixed;bottom:20px;right:20px;display:flex;gap:8px;z-index:999999;';

    function mkBtn(id, text, color, onClick) {
      const btn = document.createElement('button');
      btn.id = id;
      btn.textContent = text;
      btn.style.cssText = `padding:8px 16px;border:none;border-radius:6px;background:${color};color:#fff;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;`;
      btn.addEventListener('click', onClick);
      return btn;
    }

    const btnRender = mkBtn('ainote-btn-render', '📦 渲染 ' + name, '#1a73e8', () => renderStandaloneFormat());
    const btnReset  = mkBtn('ainote-btn-reset', '🔙 恢复', '#ea4335', () => resetPage());

    bar.appendChild(btnRender);
    bar.appendChild(btnReset);
    document.body.appendChild(bar);

    setButtonVisible('ainote-btn-reset', false);
  }

  // ========== drawio 文件检测 ==========
  function isDrawioFile() {
    const path = window.location.pathname;
    if (path.endsWith('.drawio') || path.endsWith('.dio')) return true;
    const url = window.location.href;
    if (url.includes('/raw/') && (path.includes('.drawio') || path.includes('.dio'))) return true;
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
  // CDN URL → 本地文件路径映射
  const CDN_MAPPINGS = [
    [/markdown-it@[\d.]+.*markdown-it\.min\.js/, 'markdown-it.min.js'],
    [/mermaid@[\d.]+.*mermaid\.min\.js/, 'mermaid.min.js'],
    [/katex@[\d.]+.*katex\.min\.js/, 'katex.min.js'],
    [/katex@[\d.]+.*katex\.min\.css/, 'katex.min.css'],
    [/pako@[\d.]+.*pako\.min\.js/, 'pako.min.js'],
    [/viz\.js@[\d.]+.*\/viz\.js/, 'viz.min.js'],
    [/viz\.js@[\d.]+.*lite\.render\.js/, 'full.render.min.js'],
    [/viz\.js@[\d.]+.*full\.render\.min\.js/, 'full.render.min.js'],
    [/highlight\.js@[\d.]+.*\/lib\/core\.min\.js/, 'highlight.min.js'],
    [/highlight\.js@[\d.]+.*\/lib\/languages\/(\w+)\.min\.js/, 'languages/$1.min.js'],
    [/highlight\.js@[\d.]+.*\/styles\/([\w-]+)\.min\.css/, 'styles/$1.min.css'],
  ];

  function getLocalFileName(src) {
    for (const [pattern, local] of CDN_MAPPINGS) {
      const match = src.match(pattern);
      if (match) {
        return 'lib/' + local.replace(/\$(\d+)/g, (_, n) => match[parseInt(n)] || '');
      }
    }
    return null;
  }

  function getLocalUrl(src) {
    if (!getLocalFileName(src)) return src;
    if (typeof chrome === 'undefined' || !chrome.runtime) return src;
    return chrome.runtime.getURL(getLocalFileName(src));
  }

  async function loadScript(src) {
    const localFile = getLocalFileName(src);
    if (localFile && typeof chrome !== 'undefined') {
      const url = chrome.runtime.getURL(localFile);
      try {
        await import(url);
        return;
      } catch (e) {
        console.warn('AINote import() 失败，改用间接 eval:', localFile);
      }
      try {
        const resp = await fetch(url);
        const code = await resp.text();
        (0, eval)(code);
        return;
      } catch (e2) {
        console.warn('AINote eval 也失败，降级到 DOM 加载:', localFile, e2);
      }
    }
    const url = getLocalUrl(src);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = getLocalUrl(href);
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  // ========== 渲染错误提示（供渲染器插件使用） ==========
  function showRenderError(pre, langClass, errorMsg) {
    const code = pre.querySelector('code')?.textContent || '';
    const isDark = settings.theme === 'dark';

    const wrapper = document.createElement('div');
    wrapper.className = 'ainote-render-error';
    wrapper.style.cssText = `
      margin: 16px 0;
      border: 1px solid #d73a49;
      border-radius: 8px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    `;

    wrapper.innerHTML = `
      <div style="
        background: #d73a49;
        color: #fff;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
      ">⚠️ ${langClass} 渲染失败</div>
      <div style="
        padding: 12px 16px;
        background: ${isDark ? '#1b1b2f' : '#fff8f5'};
        color: ${isDark ? '#e1e4e8' : '#24292f'};
        font-size: 13px;
      ">
        <div style="margin-bottom: 12px; word-break: break-word;">
          <strong>错误原因：</strong><span style="color:#d73a49;">${escapeHtml(errorMsg)}</span>
        </div>
        <details style="cursor: pointer;">
          <summary style="color: ${isDark ? '#8b949e' : '#586069'}; margin-bottom: 8px; user-select: none;">
            查看原始代码
          </summary>
          <pre style="
            background: ${isDark ? '#0d1117' : '#f6f8fa'};
            padding: 12px;
            border-radius: 6px;
            overflow: auto;
            max-height: 300px;
            margin: 0;
          "><code>${escapeHtml(code)}</code></pre>
        </details>
      </div>
    `;

    pre.parentNode.replaceChild(wrapper, pre);
  }

  // ========== 构建渲染上下文 ==========
  function createRenderContext() {
    return {
      settings: settings,
      escapeHtml: escapeHtml,
      loadScript: loadScript,
      loadCSS: loadCSS,
      getLocalUrl: getLocalUrl,
      getPlantUmlServerList: getPlantUmlServerList,
      showError: function(pre, langClass, errorMsg) {
        showRenderError(pre, langClass, errorMsg);
      }
    };
  }

  // ========== SVG 显示修复 ==========
  function fixSvgDisplay(container) {
    const svgs = container.querySelectorAll('svg');
    svgs.forEach(svg => {
      if (!svg.hasAttribute('width') && !svg.style.width) {
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
      }
      svg.removeAttribute('height');
    });
  }

  // ========== 主渲染函数（编排器入口）==========
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
      ">📝 AINote 正在渲染...</div>
    `;

    try {
      // 加载 markdown-it（基础库，所有 MD 渲染都需要）
      if (typeof markdownit === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js');
      }

      const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true
      });

      const html = md.render(mdText);

      const theme = settings.theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : settings.theme;

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

      document.body.innerHTML = '';
      document.body.appendChild(container);

      // ===== 关键变更：使用管道执行所有渲染器 =====
      // 替代原来逐个调用 renderMermaidBlocks / renderPlantUMLBlocks / ...
      const renderCtx = createRenderContext();
      const result = await AINotePipeline.run(container, renderCtx);

      // 补充 SVG 修复
      fixSvgDisplay(container);

      isRendered = true;
      updateToolbarState();

      // 日志：打印渲染结果（可选，帮助调试）
      if (result.failed.length > 0) {
        console.warn('[AINote] 部分渲染器失败:', result.failed.join(', '));
      }
      console.log('[AINote] 渲染完成，成功:', result.success.join(', '));

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

    // 重新渲染代码高亮（主题切换时）-- 通过管道重新运行 hljs 渲染器
    if (isRendered) {
      // 清除旧的 hljs 类，以便重新高亮（新主题色）
      var oldBlocks = container.querySelectorAll('pre code.hljs');
      for (var i = 0; i < oldBlocks.length; i++) {
        oldBlocks[i].classList.remove('hljs');
      }

      const renderCtx = createRenderContext();
      var hljsRenderer = null;
      var allRenderers = AINoteRenderers.getAll();
      for (var r = 0; r < allRenderers.length; r++) {
        if (allRenderers[r].id === 'hljs') {
          hljsRenderer = allRenderers[r];
          break;
        }
      }
      if (hljsRenderer && hljsRenderer.detect(container)) {
        hljsRenderer.render(container, renderCtx).catch(function(e) {
          console.warn('[AINote] 主题切换时高亮失败:', e);
        });
      }
    }
  }

  // ========== 恢复原始页面 ==========
  function resetPage() {
    if (originalContent) {
      document.body.innerHTML = originalContent;
      isRendered = false;
      currentMarkdownText = '';
      updateToolbarState();
    }
  }

  // ========== 渲染 drawio 文件 ==========
  async function renderDrawio() {
    if (isRendered) return;

    let xml = '';
    const preEl = document.querySelector('pre');
    if (preEl) {
      xml = preEl.textContent || '';
    } else {
      xml = document.body.innerText || '';
    }

    if (!xml || !xml.includes('<mxfile')) return;

    originalContent = document.body.innerHTML;

    document.body.innerHTML = `
      <div id="ainote-drawio-loading" style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: sans-serif;
        color: #666;
      ">📐 AINote 正在加载图表...</div>
    `;

    try {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://embed.diagrams.net/?embed=1&ui=kennedy&spin=1&proto=json';
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;z-index:999998;';
      iframe.setAttribute('allowfullscreen', '');

      const onMessage = (event) => {
        if (event.origin !== 'https://embed.diagrams.net') return;
        if (event.data === 'ready' || (typeof event.data === 'string' && event.data.includes('ready'))) {
          iframe.contentWindow.postMessage(JSON.stringify({
            action: 'load',
            autosave: 0,
            xml: xml
          }), 'https://embed.diagrams.net');
        }
      };
      window.addEventListener('message', onMessage);

      const fallbackTimer = setTimeout(() => {
        iframe.contentWindow.postMessage(JSON.stringify({
          action: 'load',
          autosave: 0,
          xml: xml
        }), 'https://embed.diagrams.net');
      }, 3000);

      iframe._ainoteCleanup = () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener('message', onMessage);
      };

      document.body.innerHTML = '';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      document.body.appendChild(iframe);

      setTimeout(() => {
        isRendered = true;
        addDrawioToolbar();
      }, 4000);
    } catch (err) {
      console.warn('AINote drawio 渲染失败:', err);
      document.body.innerHTML = originalContent;
    }
  }

  // ========== drawio 工具栏 ==========
  function addDrawioToolbar() {
    if (document.getElementById('ainote-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'ainote-toolbar';
    bar.style.cssText = 'position:fixed;bottom:20px;right:20px;display:flex;gap:8px;z-index:999999;';

    function mkBtn(id, text, color, onClick) {
      const btn = document.createElement('button');
      btn.id = id;
      btn.textContent = text;
      btn.style.cssText = `padding:8px 16px;border:none;border-radius:6px;background:${color};color:#fff;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;`;
      btn.addEventListener('click', onClick);
      return btn;
    }

    const btnReset = mkBtn('ainote-btn-reset', '🔙 查看原始 XML', '#ea4335', () => resetPage());
    bar.appendChild(btnReset);
    document.body.appendChild(bar);
  }

  // ========== 导出 PDF ==========
  function exportToPDF() {
    if (!isRendered) {
      alert('请先渲染 Markdown 内容');
      return;
    }

    const style = document.createElement('style');
    style.id = 'ainote-print-style';
    style.textContent = `
      @media print {
        #ainote-toolbar { display: none !important; }
        #ainote-rendered {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 20px !important;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

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

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ editorMode: settings.editorMode });
    }
  }

  function enterEditorMode() {
    const container = document.getElementById('ainote-rendered');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'ainote-editor-wrapper';
    wrapper.style.cssText = `
      display: flex;
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    `;

    const editorPanel = document.createElement('div');
    editorPanel.id = 'ainote-editor-panel';
    editorPanel.style.cssText = 'flex:1;min-width:0;';

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

    let previewTimer = null;
    textarea.addEventListener('input', () => {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        currentMarkdownText = textarea.value;
        updatePreview(textarea.value);
      }, 500);
    });

    editorPanel.appendChild(textarea);

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

    container.parentNode.replaceChild(wrapper, container);

    updatePreview(currentMarkdownText);
  }

  function exitEditorMode() {
    const wrapper = document.getElementById('ainote-editor-wrapper');
    if (!wrapper) return;
    renderMarkdown();
  }

  // ===== 编辑器预览（使用管道）=====
  async function updatePreview(mdText) {
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

    // ===== 关键变更：使用管道执行所有渲染器 =====
    const renderCtx = createRenderContext();
    await AINotePipeline.run(previewPanel, renderCtx);
  }

  // ========== 底部工具栏 ==========
  function addToolbar() {
    if (document.getElementById('ainote-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'ainote-toolbar';
    bar.style.cssText = 'position:fixed;bottom:20px;right:20px;display:flex;gap:8px;z-index:999999;';

    function mkBtn(id, text, color, onClick) {
      const btn = document.createElement('button');
      btn.id = id;
      btn.textContent = text;
      btn.style.cssText = `padding:8px 16px;border:none;border-radius:6px;background:${color};color:#fff;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;`;
      btn.addEventListener('click', onClick);
      return btn;
    }

    const btnRender = mkBtn('ainote-btn-render', '📝 渲染', '#1a73e8', () => renderMarkdown());
    const btnEditor = mkBtn('ainote-btn-editor', '✏️ 编辑器', '#34a853', () => toggleEditorMode());
    const btnPDF    = mkBtn('ainote-btn-pdf', '📄 导出PDF', '#f9ab00', () => exportToPDF());
    const btnReset  = mkBtn('ainote-btn-reset', '🔙 恢复', '#ea4335', () => resetPage());

    bar.appendChild(btnRender);
    bar.appendChild(btnEditor);
    bar.appendChild(btnPDF);
    bar.appendChild(btnReset);
    document.body.appendChild(bar);

    setButtonVisible('ainote-btn-editor', false);
    setButtonVisible('ainote-btn-pdf', false);
    setButtonVisible('ainote-btn-reset', false);
  }

  function setButtonVisible(id, visible) {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = visible ? '' : 'none';
  }

  function updateToolbarState() {
    setButtonVisible('ainote-btn-editor', isRendered);
    setButtonVisible('ainote-btn-pdf', isRendered);
    setButtonVisible('ainote-btn-reset', isRendered);
    setButtonVisible('ainote-btn-render', !isRendered);
  }

  // ========== 键盘快捷键 ==========
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      if (isRendered) {
        resetPage();
      } else if (detectStandaloneFormat()) {
        renderStandaloneFormat();
      } else {
        renderMarkdown();
      }
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      toggleEditorMode();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      exportToPDF();
    }
  });

  // ========== 页面加载检测 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isMdFile()) addToolbar();
      else if (isDrawioFile()) renderDrawio();
      else if (detectStandaloneFormat()) addStandaloneToolbar();
    });
  } else {
    if (isMdFile()) addToolbar();
    else if (isDrawioFile()) renderDrawio();
    else if (detectStandaloneFormat()) addStandaloneToolbar();
  }
})();
