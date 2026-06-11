/**
 * Mermaid 图表渲染器
 */
import mermaid from 'mermaid';
import registry from './renderer-registry.js';

registry.register({
  id: 'mermaid',
  name: 'Mermaid',
  codeBlockLanguages: ['mermaid'],

  detect(container) {
    return container.querySelectorAll('code.language-mermaid').length > 0;
  },

  async render(container, ctx) {
    const blocks = container.querySelectorAll('code.language-mermaid');
    if (blocks.length === 0) return;

    const theme = ctx.settings ? ctx.settings.theme : 'light';
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
      });
    } catch (e) {
      console.warn('[AINote] Mermaid 初始化失败:', e);
    }

    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx];
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;
      const id = `mermaid-svg-${Date.now()}-${idx}`;

      try {
        const { svg } = await mermaid.render(id, code);
        const wrapper = document.createElement('div');
        wrapper.className = 'ainote-mermaid';
        wrapper.innerHTML = svg;
        const svgEl = wrapper.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
        pre.parentNode.replaceChild(wrapper, pre);
      } catch (e) {
        console.warn('[AINote] Mermaid 渲染失败:', e);
        pre.classList.add('ainote-render-error');
        pre.innerHTML = `<code>⚠️ Mermaid 渲染失败: ${ctx.escapeHtml ? ctx.escapeHtml(e.message) : e.message}</code>`;
      }
    }
  },
});
