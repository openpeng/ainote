/**
 * Graphviz/DOT 图表渲染器
 */
import { instance } from '@viz-js/viz';
import registry from './renderer-registry.js';

let vizInstance = null;

async function getVizInstance() {
  if (!vizInstance) {
    vizInstance = await instance();
  }
  return vizInstance;
}

registry.register({
  id: 'graphviz',
  name: 'Graphviz/DOT',
  codeBlockLanguages: ['dot', 'graphviz'],

  detect(container) {
    return container.querySelectorAll('code.language-dot, code.language-graphviz').length > 0;
  },

  async render(container, ctx) {
    const blocks = container.querySelectorAll('code.language-dot, code.language-graphviz');
    if (blocks.length === 0) return;

    const viz = await getVizInstance();

    for (const block of blocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;

      try {
        const svgStr = viz.renderString(code);
        const wrapper = document.createElement('div');
        wrapper.className = 'ainote-graphviz';
        wrapper.style.cssText = 'text-align:center;margin:16px 0;';
        wrapper.innerHTML = svgStr;

        const svgEl = wrapper.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }

        pre.parentNode.replaceChild(wrapper, pre);
      } catch (err) {
        console.warn('[AINote] Graphviz 渲染失败:', err);
        if (ctx.showError) {
          ctx.showError(pre, 'Graphviz', err.message || String(err));
        } else {
          pre.classList.add('ainote-render-error');
          pre.innerHTML = `<code>⚠️ Graphviz 渲染失败: ${err.message}</code>`;
        }
      }
    }
  },
});
