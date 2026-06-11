/**
 * D2 图表渲染器（通过 D2 API）
 */
import registry from './renderer-registry.js';

registry.register({
  id: 'd2',
  name: 'D2',
  codeBlockLanguages: ['d2'],

  detect(container) {
    return container.querySelectorAll('code.language-d2').length > 0;
  },

  async render(container, ctx) {
    const blocks = container.querySelectorAll('code.language-d2');
    if (blocks.length === 0) return;

    for (const block of blocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;

      try {
        const response = await fetch('https://d2lang.com/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, format: 'svg' }),
        });

        if (response.ok) {
          const result = await response.json();
          const wrapper = document.createElement('div');
          wrapper.className = 'ainote-d2';
          wrapper.style.cssText = 'text-align:center;margin:16px 0;';
          wrapper.innerHTML = result.svg;

          const svgEl = wrapper.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }

          pre.parentNode.replaceChild(wrapper, pre);
        } else {
          throw new Error('HTTP ' + response.status);
        }
      } catch (err) {
        console.warn('[AINote] D2 渲染失败:', err);
        if (ctx.showError) {
          ctx.showError(pre, 'D2', err.message || String(err));
        } else {
          pre.classList.add('ainote-render-error');
          pre.innerHTML = `<code>⚠️ D2 渲染失败: ${err.message}</code>`;
        }
      }
    }
  },
});
