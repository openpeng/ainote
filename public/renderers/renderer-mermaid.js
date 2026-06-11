// ========== Mermaid 图表渲染器 ==========
(function() {
  'use strict';

  AINoteRenderers.register({
    id: 'mermaid',
    name: 'Mermaid',
    codeBlockLanguages: ['mermaid'],
    dependencies: [
      'https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js'
    ],

    detect: function(container) {
      return container.querySelectorAll('code.language-mermaid').length > 0;
    },

    render: async function(container, ctx) {
      if (typeof mermaid === 'undefined') return;

      var blocks = container.querySelectorAll('code.language-mermaid');
      if (blocks.length === 0) return;

      var theme = ctx.settings.theme === 'dark' ? 'dark' : 'default';
      mermaid.initialize({
        startOnLoad: false,
        theme: theme,
        securityLevel: 'loose'
      });

      var index = 0;
      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var pre = block.closest('pre');
        if (!pre) continue;

        var code = block.textContent;
        var id = 'ainote-mermaid-' + (index++);

        try {
          var result = await mermaid.render(id, code);
          var wrapper = document.createElement('div');
          wrapper.className = 'mermaid-chart';
          wrapper.innerHTML = result.svg;
          pre.parentNode.replaceChild(wrapper, pre);
        } catch (err) {
          ctx.showError(pre, 'Mermaid', err.message || String(err));
        }
      }
    }
  });

})();
