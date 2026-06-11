/**
 * Vega / Vega-Lite 数据可视化渲染器
 */
import vegaEmbed from 'vega-embed';
import registry from './renderer-registry.js';

registry.register({
  id: 'vega',
  name: 'Vega/Vega-Lite',
  codeBlockLanguages: ['vega', 'vega-lite'],

  detect(container) {
    return container.querySelectorAll('code.language-vega, code.language-vega-lite').length > 0;
  },

  async render(container, ctx) {
    const blocks = container.querySelectorAll('code.language-vega, code.language-vega-lite');
    if (blocks.length === 0) return;

    for (const block of blocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;
      const isLite = block.classList.contains('language-vega-lite');

      try {
        const spec = JSON.parse(code);

        const wrapper = document.createElement('div');
        wrapper.className = 'ainote-vega';
        wrapper.style.cssText = 'margin:16px 0;overflow-x:auto;';
        pre.parentNode.replaceChild(wrapper, pre);

        await vegaEmbed(wrapper, spec, {
          mode: isLite ? 'vega-lite' : 'vega',
          actions: false,
          renderer: 'svg',
          logLevel: 'warn',
        });
      } catch (err) {
        console.warn('[AINote] Vega 渲染失败:', err);
        if (ctx.showError) {
          ctx.showError(pre, 'Vega/Vega-Lite', err.message || String(err));
        } else {
          pre.classList.add('ainote-render-error');
          pre.innerHTML = `<code>⚠️ Vega 渲染失败: ${err.message}</code>`;
        }
      }
    }
  },
});
