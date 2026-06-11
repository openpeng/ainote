// ========== Highlight.js 代码高亮渲染器 ==========
(function() {
  'use strict';

  var hljsLoaded = false;
  var currentHljsTheme = null;

  async function loadHighlightTheme(ctx, themeName) {
    if (!hljsLoaded) {
      await ctx.loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/core.min.js');
      hljsLoaded = true;
    }

    // 如果主题没变，跳过
    if (currentHljsTheme === themeName) return;

    // 移除旧主题 CSS
    var oldLinks = document.querySelectorAll('link[data-hljs-theme]');
    for (var i = 0; i < oldLinks.length; i++) oldLinks[i].remove();

    // 加载新主题
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ctx.getLocalUrl(
      'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/' + themeName + '.min.css'
    );
    link.setAttribute('data-hljs-theme', themeName);
    document.head.appendChild(link);

    currentHljsTheme = themeName;
  }

  AINoteRenderers.register({
    id: 'hljs',
    name: 'Highlight.js',
    codeBlockLanguages: null,
    dependencies: [],
    // 注意：依赖加载已由 loadHighlightTheme 内部处理（非标准加载路径）
    // dependencies 列表为空，实际加载在 render 中完成

    detect: function(container) {
      return container.querySelectorAll('pre code').length > 0;
    },

    render: async function(container, ctx) {
      var themeName = ctx.settings.theme === 'dark' ? 'github-dark' : 'github';
      await loadHighlightTheme(ctx, themeName);

      if (typeof hljs === 'undefined') return;

      var codeBlocks = container.querySelectorAll('pre code');
      for (var i = 0; i < codeBlocks.length; i++) {
        var block = codeBlocks[i];
        // 跳过 mermaid 代码块
        if (block.classList.contains('language-mermaid')) continue;
        // 跳过已高亮的
        if (block.classList.contains('hljs')) continue;

        try {
          hljs.highlightElement(block);
        } catch (e) {
          // ignore
        }
      }
    }
  });

})();
