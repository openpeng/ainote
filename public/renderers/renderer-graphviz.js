// ========== Graphviz/DOT 图表渲染器 ==========
(function() {
  'use strict';

  AINoteRenderers.register({
    id: 'graphviz',
    name: 'Graphviz/DOT',
    codeBlockLanguages: ['dot', 'graphviz'],
    dependencies: [
      'https://cdn.jsdelivr.net/npm/viz.js@2.1.2/viz.js',
      'https://cdn.jsdelivr.net/npm/viz.js@2.1.2/lite.render.js'
    ],

    detect: function(container) {
      return container.querySelectorAll('code.language-dot, code.language-graphviz').length > 0;
    },

    render: async function(container, ctx) {
      var blocks = container.querySelectorAll('code.language-dot, code.language-graphviz');
      if (blocks.length === 0) return;

      if (typeof Viz === 'undefined') return;

      var viz = new Viz();

      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var pre = block.closest('pre');
        if (!pre) continue;

        var code = block.textContent;

        try {
          var svg = await viz.renderSVGElement(code);
          var wrapper = document.createElement('div');
          wrapper.className = 'graphviz-chart';
          wrapper.style.cssText = 'text-align:center;margin:16px 0;';
          wrapper.appendChild(svg);
          pre.parentNode.replaceChild(wrapper, pre);
        } catch (err) {
          ctx.showError(pre, 'Graphviz', err.message || String(err));
        }
      }
    }
  });

})();
