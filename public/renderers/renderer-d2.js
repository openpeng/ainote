// ========== D2 图表渲染器 ==========
(function() {
  'use strict';

  AINoteRenderers.register({
    id: 'd2',
    name: 'D2',
    codeBlockLanguages: ['d2'],
    dependencies: [],

    detect: function(container) {
      return container.querySelectorAll('code.language-d2').length > 0;
    },

    render: async function(container, ctx) {
      var blocks = container.querySelectorAll('code.language-d2');
      if (blocks.length === 0) return;

      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var pre = block.closest('pre');
        if (!pre) continue;

        var code = block.textContent;

        try {
          var response = await fetch('https://d2lang.com/api/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, format: 'svg' })
          });

          if (response.ok) {
            var result = await response.json();
            var wrapper = document.createElement('div');
            wrapper.className = 'd2-chart';
            wrapper.style.cssText = 'text-align:center;margin:16px 0;';
            wrapper.innerHTML = result.svg;
            pre.parentNode.replaceChild(wrapper, pre);
          } else {
            ctx.showError(pre, 'D2', 'HTTP ' + response.status);
          }
        } catch (err) {
          ctx.showError(pre, 'D2', err.message || String(err));
        }
      }
    }
  });

})();
