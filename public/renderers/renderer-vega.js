// ========== Vega / Vega-Lite 数据可视化渲染器 ==========
// 纯前端渲染，零 API 依赖
(function() {
  'use strict';

  AINoteRenderers.register({
    id: 'vega',
    name: 'Vega/Vega-Lite',
    codeBlockLanguages: ['vega', 'vega-lite'],
    dependencies: [
      'https://cdn.jsdelivr.net/npm/vega@5.25.0/build/vega.min.js',
      'https://cdn.jsdelivr.net/npm/vega-lite@5.16.3/build/vega-lite.min.js',
      'https://cdn.jsdelivr.net/npm/vega-embed@6.24.1/build/vega-embed.min.js'
    ],

    detect: function(container) {
      return container.querySelectorAll(
        'code.language-vega, code.language-vega-lite'
      ).length > 0;
    },

    render: async function(container, ctx) {
      var blocks = container.querySelectorAll(
        'code.language-vega, code.language-vega-lite'
      );
      if (blocks.length === 0) return;

      if (typeof vegaEmbed === 'undefined') {
        console.warn('[Vega] 库未加载，跳过渲染');
        return;
      }

      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var pre = block.closest('pre');
        if (!pre) continue;

        var code = block.textContent;
        var isLite = block.classList.contains('language-vega-lite');

        try {
          var spec = JSON.parse(code);

          var wrapper = document.createElement('div');
          wrapper.className = 'ainote-r-vega-wrapper';
          wrapper.style.cssText = 'margin:16px 0;overflow-x:auto;';

          pre.parentNode.replaceChild(wrapper, pre);

          // vegaEmbed 需要元素在 DOM 中
          await vegaEmbed(wrapper, spec, {
            mode: isLite ? 'vega-lite' : 'vega',
            actions: false,       // 隐藏编辑/导出菜单
            renderer: 'svg',      // 用 SVG 渲染（更清晰）
            logLevel: 'warn'
          });
        } catch (err) {
          ctx.showError(pre, 'Vega/Vega-Lite', err.message || String(err));
        }
      }
    }
  });

})();
