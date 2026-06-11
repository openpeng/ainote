// ========== WaveDrom 数字时序图渲染器 ==========
// 纯前端渲染，零 API 依赖
(function() {
  'use strict';

  AINoteRenderers.register({
    id: 'wavedrom',
    name: 'WaveDrom',
    codeBlockLanguages: ['wave', 'wavedrom'],
    dependencies: [
      'https://cdn.jsdelivr.net/npm/wavedrom@3.2.0/skins/default.js',
      'https://cdn.jsdelivr.net/npm/wavedrom@3.2.0/wavedrom.min.js'
    ],

    detect: function(container) {
      return container.querySelectorAll(
        'code.language-wave, code.language-wavedrom'
      ).length > 0;
    },

    render: async function(container, ctx) {
      var blocks = container.querySelectorAll(
        'code.language-wave, code.language-wavedrom'
      );
      if (blocks.length === 0) return;

      // WaveDrom 通过全局 window.WaveDrom 访问
      if (typeof WaveDrom === 'undefined') {
        console.warn('[WaveDrom] 库未加载，跳过渲染');
        return;
      }

      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var pre = block.closest('pre');
        if (!pre) continue;

        var code = block.textContent.trim();

        try {
          var config;
          // 支持 JSON 对象 或 JSON 数组格式
          try {
            config = JSON.parse(code);
          } catch (e) {
            // 如果解析失败，尝试将整个代码作为 signal 数组的一个元素
            config = { signal: [{ name: 'Signal', wave: code }] };
          }

          // 确保 config 有 signal 属性（WaveDrom 要求）
          if (!config.signal && !Array.isArray(config)) {
            config = { signal: [config] };
          }

          var wrapper = document.createElement('div');
          wrapper.className = 'ainote-r-wavedrom-wrapper';
          wrapper.style.cssText = 'text-align:center;margin:16px 0;padding:16px;overflow-x:auto;';

          // 替换 pre
          pre.parentNode.replaceChild(wrapper, pre);

          // WaveDrom 需要渲染到一个独立元素
          var inner = document.createElement('div');
          inner.id = 'ainote-wavedrom-' + i;
          wrapper.appendChild(inner);

          // 渲染波形图
          WaveDrom.renderWaveForm(i, config, inner.id);

          // 确保 SVG 响应式
          var svg = wrapper.querySelector('svg');
          if (svg) {
            svg.style.maxWidth = '100%';
            svg.style.height = 'auto';
          }
        } catch (err) {
          ctx.showError(pre, 'WaveDrom', err.message || String(err));
        }
      }
    }
  });

})();
