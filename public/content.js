// AINote 内容脚本 - 渲染 .md 文件
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
    // PlantUML 服务器配置（按优先级排列，自动 fallback）
    plantUmlServer: 'auto', // 'auto' | 'official' | 'custom'
    plantUmlCustomServer: ''
  };

  // PlantUML 服务器列表（按推荐顺序）
  const PLANTUML_SERVERS = {
    official:   'https://www.plantuml.com/plantuml',
    // 国内镜像（如有可用，用户可自定义填入）
    mirror_cn:  '', // 预留，用户可在设置中填写
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
        servers.push(PLANTUML_SERVERS.official); // custom 失败也 fallback 到官方
        break;
      case 'auto':
      default:
        // 先试用官方，后续可加入延迟检测自动排序
        servers.push(PLANTUML_SERVERS.official);
        if (settings.plantUmlCustomServer) {
          servers.push(settings.plantUmlCustomServer.replace(/\/+$/, ''));
        }
        break;
    }
    // 去重
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
  // CDN URL → 本地文件路径映射
  const CDN_MAPPINGS = [
    // 主库
    [/markdown-it@[\d.]+.*markdown-it\.min\.js/, 'markdown-it.min.js'],
    [/mermaid@[\d.]+.*mermaid\.min\.js/, 'mermaid.min.js'],
    [/katex@[\d.]+.*katex\.min\.js/, 'katex.min.js'],
    [/katex@[\d.]+.*katex\.min\.css/, 'katex.min.css'],
    [/pako@[\d.]+.*pako\.min\.js/, 'pako.min.js'],
    // Viz.js
    [/viz\.js@[\d.]+.*\/viz\.js/, 'viz.min.js'],
    [/viz\.js@[\d.]+.*lite\.render\.js/, 'full.render.min.js'],
    [/viz\.js@[\d.]+.*full\.render\.min\.js/, 'full.render.min.js'],
    // highlight.js
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

  // 通过动态 import() 将 JS 库加载到 ISOLATED world
  // Content scripts 在 MV3 中可以通过 import() 加载 chrome-extension:// URL
  // 部分库（如 mermaid 的 esbuild 产物）在 ESM 上下文会失败，改为间接 eval 执行
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
      // 间接 eval 在全局作用域执行，var 声明的变量会正确设为 window 属性
      try {
        const resp = await fetch(url);
        const code = await resp.text();
        (0, eval)(code);
        return;
      } catch (e2) {
        console.warn('AINote eval 也失败，降级到 DOM 加载:', localFile, e2);
      }
    }
    // 最终降级：通过 DOM <script> 标签加载（MAIN world）
    const url = getLocalUrl(src);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // CSS 通过 DOM <link> 加载（无 isolated world 问题）
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

  // ========== 渲染错误提示 ==========
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
        showRenderError(pre, 'Mermaid', err.message || String(err));
      }
    }
  }

  // ========== PlantUML 降级显示 ==========
  function showPlantUmlFallback(pre, code, errorMsg) {
    showRenderError(pre, 'PlantUML', errorMsg);
  }

  // ========== PlantUML 编码（用于生成图片 URL） ==========
  // 确保 pako 库只加载一次
  let pakoLoadPromise = null;
  async function ensurePako() {
    if (typeof pako !== 'undefined') return;
    if (pakoLoadPromise) return pakoLoadPromise;
    pakoLoadPromise = loadScript('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');
    return pakoLoadPromise;
  }

  // Uint8Array 转标准 Base64（安全的分块方式，避免栈溢出）
  function uint8ToBase64(bytes) {
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
      binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
  }

  // 标准 Base64 字符 → PlantUML 自定义字母表
  const PLANTUML_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  const STANDARD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  async function plantUmlEncode(text) {
    // 1. UTF-8 编码（使用浏览器原生 TextEncoder，正确处理所有 Unicode 字符）
    const utf8Bytes = new TextEncoder().encode(text);

    // 2. Deflate 压缩（优先使用 pako，失败则使用未压缩原文）
    let compressed;
    if (typeof pako !== 'undefined') {
      try {
        compressed = pako.deflateRaw(utf8Bytes, { level: 9 });
      } catch (e) {
        console.warn('AINote PlantUML deflate 失败，使用未压缩文本:', e);
        compressed = utf8Bytes;
      }
    } else {
      // pako 未加载，使用未压缩原文（PlantUML 服务器也支持）
      compressed = utf8Bytes;
    }

    // 3. 转成标准 Base64
    const standardBase64 = uint8ToBase64(compressed);

    // 4. 映射到 PlantUML 自定义字母表（跳过 = 填充符）
    let plantUml = '';
    for (const c of standardBase64) {
      if (c === '=') continue;
      const idx = STANDARD_ALPHABET.indexOf(c);
      if (idx !== -1) {
        plantUml += PLANTUML_ALPHABET[idx];
      }
    }

    // 5. URL 长度检查（PlantUML 服务器建议不超过 ~8000 字符）
    const fullUrl = `https://www.plantuml.com/plantuml/svg/${plantUml}`;
    if (fullUrl.length > 8000) {
      console.warn(
        `AINote PlantUML: URL 长度 ${fullUrl.length} 超过建议值 8000，` +
        '图表可能显示失败。建议拆分较大的 PlantUML 图。'
      );
    }

    return plantUml;
  }

  // ========== 渲染 PlantUML 图表 ==========
  async function renderPlantUMLBlocks(container) {
    const plantUmlBlocks = container.querySelectorAll('code.language-plantuml, code.language-uml');
    if (plantUmlBlocks.length === 0) return;

    await ensurePako();

    for (const block of plantUmlBlocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;
      let encoded;
      try {
        encoded = plantUmlEncode(code);
      } catch (e) {
        console.warn('AINote PlantUML 编码失败:', e);
        showPlantUmlFallback(pre, code, '编码失败: ' + e.message);
        continue;
      }

      // 构建待尝试的服务器 URL 列表
      const serverList = getPlantUmlServerList();
      const imgUrls = serverList.map(s => `${s}/svg/${encoded}`);

      // URL 过长，直接降级显示原始代码，不发起网络请求
      const firstUrl = imgUrls[0] || `https://www.plantuml.com/plantuml/svg/${encoded}`;
      if (firstUrl.length > 8000) {
        showPlantUmlFallback(pre, code, `图表过大（URL ${firstUrl.length} 字符），请拆分后重试`);
        continue;
      }

      // 多服务器 fallback 加载 PlantUML 图片
      await loadPlantUmlWithFallback(pre, code, imgUrls);
    }
  }

  // 多服务器 fallback：依次尝试，直到成功
  async function loadPlantUmlWithFallback(pre, code, imgUrls) {
    const wrapper = document.createElement('div');
    wrapper.className = 'plantuml-chart';
    wrapper.style.cssText = 'text-align: center; margin: 16px 0; padding: 16px; border-radius: 8px;';

    if (settings.theme === 'dark') {
      wrapper.style.background = '#161b22';
      wrapper.style.color = '#c9d1d9';
    } else {
      wrapper.style.background = '#f6f8fa';
      wrapper.style.color = '#24292e';
    }

    // 先显示加载提示
    wrapper.innerHTML = '<div style="font-size:12px;color:#888;">⏳ PlantUML 加载中...</div>';

    // 如果 pre 还在 DOM 中，替换它
    if (pre && pre.parentNode) {
      pre.parentNode.replaceChild(wrapper, pre);
    }

    // 依次尝试每个服务器
    for (let i = 0; i < imgUrls.length; i++) {
      const url = imgUrls[i];
      try {
        // 用 fetch 探测（带超时），避免 img.onerror 无法区分哪台服务器
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const resp = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!resp.ok) continue;

        const svgText = await resp.text();
        if (!svgText || !svgText.includes('<svg')) continue;

        // 成功，渲染 SVG
        wrapper.innerHTML = svgText;
        const svgEl = wrapper.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
        return; // 成功，退出
      } catch (e) {
        console.warn(`AINote PlantUML 服务器 ${url} 失败:`, e.message);
        // 尝试下一个服务器
      }
    }

    // 所有服务器都失败，显示降级内容
    const isDark = settings.theme === 'dark';
    wrapper.innerHTML = `
      <div style="
        background: #d73a49;
        color: #fff;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 8px 8px 0 0;
        margin: -16px -16px 0 -16px;
      ">⚠️ PlantUML 渲染失败</div>
      <div style="
        padding: 12px 0 0 0;
        font-size: 13px;
        color: ${isDark ? '#e1e4e8' : '#24292f'};
      ">
        <div style="margin-bottom: 12px; word-break: break-word;">
          <strong>错误原因：</strong><span style="color:#d73a49;">所有 PlantUML 服务器均不可达</span>
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
    // 尝试语法高亮
    if (typeof hljs !== 'undefined') {
      const codeEl = wrapper.querySelector('code');
      if (codeEl) { try { hljs.highlightElement(codeEl); } catch (e) {} }
    }
  }

  // ========== 渲染 Graphviz/DOT 图表 ==========
  async function renderGraphvizBlocks(container) {
    const dotBlocks = container.querySelectorAll('code.language-dot, code.language-graphviz');
    if (dotBlocks.length === 0) return;

    // 动态加载 Viz.js
    if (typeof Viz === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/viz.js@2.1.2/viz.js');
      await loadScript('https://cdn.jsdelivr.net/npm/viz.js@2.1.2/lite.render.js');
    }

    if (typeof Viz === 'undefined') return;

    const viz = new Viz();
    let index = 0;

    for (const block of dotBlocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;

      try {
        const svg = await viz.renderSVGElement(code);
        const wrapper = document.createElement('div');
        wrapper.className = 'graphviz-chart';
        wrapper.style.cssText = 'text-align: center; margin: 16px 0;';
        wrapper.appendChild(svg);
        pre.parentNode.replaceChild(wrapper, pre);
      } catch (err) {
        showRenderError(pre, 'Graphviz', err.message || String(err));
      }

      index++;
    }
  }

  // ========== 渲染 D2 图表 ==========
  async function renderD2Blocks(container) {
    const d2Blocks = container.querySelectorAll('code.language-d2');
    if (d2Blocks.length === 0) return;

    // D2 使用官方服务器渲染
    let index = 0;
    for (const block of d2Blocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;

      try {
        // 使用 D2 官方 API（需要网络请求）
        const response = await fetch('https://d2lang.com/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code, format: 'svg' })
        });

        if (response.ok) {
          const result = await response.json();
          const wrapper = document.createElement('div');
          wrapper.className = 'd2-chart';
          wrapper.style.cssText = 'text-align: center; margin: 16px 0;';
          wrapper.innerHTML = result.svg;
          pre.parentNode.replaceChild(wrapper, pre);
        } else {
          showRenderError(pre, 'D2', `HTTP ${response.status}`);
        }
      } catch (err) {
        showRenderError(pre, 'D2', err.message || String(err));
      }

      index++;
    }
  }

  // ========== 确保 SVG 正常显示 ==========
  function fixSvgDisplay(container) {
    const svgs = container.querySelectorAll('svg');
    svgs.forEach(svg => {
      // 确保 SVG 有合适的样式
      if (!svg.hasAttribute('width') && !svg.style.width) {
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
      }
      // 移除可能影响显示的内联样式
      svg.removeAttribute('height');
    });
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

    if (!hljsLoaded) {
      // 加载已打包常用语言的高亮库（cdnjs 版内含 30+ 种语言）
      await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/core.min.js');
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
      link.href = getLocalUrl(`https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/${themeName}.min.css`);
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

      // 渲染 PlantUML 图表
      await renderPlantUMLBlocks(container);

      // 渲染 Graphviz/DOT 图表
      await renderGraphvizBlocks(container);

      // 渲染 D2 图表
      await renderD2Blocks(container);

      // 渲染 KaTeX 公式
      renderMath(container);

      // 代码高亮
      await highlightCodeBlocks(container);

      // 确保 SVG 正常显示
      fixSvgDisplay(container);

      isRendered = true;
      updateToolbarState();

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
      updateToolbarState();
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
    await renderMermaidBlocks(previewPanel);

    // 渲染 PlantUML
    await renderPlantUMLBlocks(previewPanel);

    // 渲染 Graphviz/DOT
    await renderGraphvizBlocks(previewPanel);

    // 渲染 D2
    await renderD2Blocks(previewPanel);

    // 渲染公式
    renderMath(previewPanel);

    // 确保 SVG 正常显示
    fixSvgDisplay(previewPanel);
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

    // Ctrl+Shift+D: 导出 PDF
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      exportToPDF();
    }
  });

  // ========== 页面加载检测 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isMdFile()) addToolbar();
    });
  } else {
    if (isMdFile()) addToolbar();
  }
})();
