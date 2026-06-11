// ========== AsciiDoc (.adoc) 渲染器 ==========
// 使用 Asciidoctor.js 将 AsciiDoc 文件渲染为 HTML
(function() {
  'use strict';

  AINoteRenderers.registerStandalone({
    id: 'adoc',
    name: 'AsciiDoc',
    filePattern: '\\.(adoc|asciidoc)$',
    dependencies: [
      'https://cdn.jsdelivr.net/npm/asciidoctor@3.0.4/dist/browser/asciidoctor.min.js'
    ],

    renderStandalone: async function(rawContent, ctx) {
      if (typeof Asciidoctor === 'undefined') {
        throw new Error('Asciidoctor.js 库未加载');
      }

      var theme = ctx.settings.theme;
      var isDark = theme === 'dark';

      var asciidoctor = Asciidoctor();
      var doc = asciidoctor.load(rawContent, {
        safe: 'safe',
        attributes: {
          'source-highlighter': 'highlight.js',
          icons: 'font',
          'setanchors': true,
          toc: 'auto'
        }
      });

      var html = doc.convert();

      // 构建页面容器
      var container = document.createElement('div');
      container.id = 'ainote-adoc-rendered';
      container.style.cssText =
        'max-width:900px;margin:0 auto;padding:32px;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;' +
        'font-size:' + (ctx.settings.fontSize || 16) + 'px;' +
        'line-height:1.6;' +
        (isDark ? 'background:#0d1117;color:#c9d1d9;' : 'background:#fff;color:#24292f;');

      container.innerHTML = html;

      document.body.innerHTML = '';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.appendChild(container);

      // 代码高亮
      if (typeof hljs !== 'undefined') {
        var codeBlocks = container.querySelectorAll('pre code');
        for (var i = 0; i < codeBlocks.length; i++) {
          try { hljs.highlightElement(codeBlocks[i]); } catch (e) {}
        }
      }

      // 尝试解析 AsciiDoc 中嵌入的图表代码块（通过管道）
      if (typeof AINotePipeline !== 'undefined') {
        var pipelineCtx = {
          settings: ctx.settings,
          escapeHtml: ctx.escapeHtml,
          loadScript: ctx.loadScript,
          loadCSS: ctx.loadCSS,
          getLocalUrl: ctx.getLocalUrl,
          getPlantUmlServerList: ctx.getPlantUmlServerList,
          showError: ctx.showError
        };
        try { await AINotePipeline.run(container, pipelineCtx); } catch (e) {}
      }
    }
  });

})();
