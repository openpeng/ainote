/**
 * WaveDrom 数字时序图渲染器
 */
import registry from './renderer-registry.js';

registry.register({
  id: 'wavedrom',
  name: 'WaveDrom',
  codeBlockLanguages: ['wave', 'wavedrom'],

  detect(container) {
    return container.querySelectorAll('code.language-wave, code.language-wavedrom').length > 0;
  },

  async render(container, ctx) {
    const blocks = container.querySelectorAll('code.language-wave, code.language-wavedrom');
    if (blocks.length === 0) return;

    // 动态加载 WaveDrom（使用全局 API）
    if (typeof WaveDrom === 'undefined') {
      try {
        await import('wavedrom');
      } catch (e) {
        console.warn('[AINote] WaveDrom 加载失败:', e);
        return;
      }
    }

    if (typeof WaveDrom === 'undefined') {
      console.warn('[AINote] WaveDrom 未加载');
      return;
    }

    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx];
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent.trim();

      try {
        let config;
        try {
          config = JSON.parse(code);
        } catch (e) {
          config = { signal: [{ name: 'Signal', wave: code }] };
        }

        if (!config.signal && !Array.isArray(config)) {
          config = { signal: [config] };
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'ainote-wavedrom';
        wrapper.style.cssText = 'text-align:center;margin:16px 0;padding:16px;overflow-x:auto;';
        pre.parentNode.replaceChild(wrapper, pre);

        const inner = document.createElement('div');
        inner.id = 'ainote-wavedrom-' + Date.now() + '-' + idx;
        wrapper.appendChild(inner);

        WaveDrom.renderWaveForm(idx, config, inner.id);

        const svg = wrapper.querySelector('svg');
        if (svg) {
          svg.style.maxWidth = '100%';
          svg.style.height = 'auto';
        }
      } catch (err) {
        console.warn('[AINote] WaveDrom 渲染失败:', err);
        if (ctx.showError) {
          ctx.showError(pre, 'WaveDrom', err.message || String(err));
        } else {
          pre.classList.add('ainote-render-error');
          pre.innerHTML = `<code>⚠️ WaveDrom 渲染失败: ${err.message}</code>`;
        }
      }
    }
  },
});
