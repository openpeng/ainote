// ========== Nomnoml 简易 UML 渲染器 ==========
// 纯前端渲染，零 API 依赖
(function() {
  'use strict';

  AINoteRenderers.register({
    id: 'nomnoml',
    name: 'Nomnoml',
    codeBlockLanguages: ['nomnoml'],
    dependencies: [
      'https://cdn.jsdelivr.net/npm/nomnoml@1.5.3/dist/nomnoml.js'
    ],

    detect: function(container) {
      return container.querySelectorAll('code.language-nomnoml').length > 0;
    },

    render: async function(container, ctx) {
      var blocks = container.querySelectorAll('code.language-nomnoml');
      if (blocks.length === 0) return;

      if (typeof nomnoml === 'undefined') {
        console.warn('[Nomnoml] 库未加载，跳过渲染');
        return;
      }

      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var pre = block.closest('pre');
        if (!pre) continue;

        var code = block.textContent;

        try {
          // Canvas 是 nomnoml 渲染的默认方式，也支持 SVG
          // 这里直接用 draw() 生成 SVG 源码，然后用 DOM 展示
          var svg = document.createElement('svg');
          // nomnoml.draw() 返回字符串或直接操作传入的 canvas
          // 尝试 nomnoml.renderSvg(code) 方法
          var svgText = '';
          if (typeof nomnoml.renderSvg === 'function') {
            svgText = nomnoml.renderSvg(code);
          } else {
            // 旧版 API：使用 canvas 中转
            var canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            nomnoml.draw(canvas, code);
            // 将 canvas 转成 img
            var img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.style.maxWidth = '100%';

            var wrapper = document.createElement('div');
            wrapper.className = 'ainote-r-nomnoml-wrapper';
            wrapper.style.cssText = 'text-align:center;margin:16px 0;';
            wrapper.appendChild(img);
            pre.parentNode.replaceChild(wrapper, pre);
            continue;
          }

          var wrapper = document.createElement('div');
          wrapper.className = 'ainote-r-nomnoml-wrapper';
          wrapper.style.cssText = 'text-align:center;margin:16px 0;';
          wrapper.innerHTML = svgText;

          var svgEl = wrapper.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }

          pre.parentNode.replaceChild(wrapper, pre);
        } catch (err) {
          ctx.showError(pre, 'Nomnoml', err.message || String(err));
        }
      }
    }
  });

})();
