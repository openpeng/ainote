/**
 * Nomnoml UML 图表渲染器
 * 通过 CDN 加载浏览器兼容版本
 */
import registry from './renderer-registry.js';

let nomnomlLoaded = false;

async function loadNomnoml() {
  if (nomnomlLoaded) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/nomnoml@1.7.0/dist/nomnoml.js';
    script.onload = () => { nomnomlLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Nomnoml 加载失败'));
    document.head.appendChild(script);
  });
}

registry.register({
  id: 'nomnoml',
  name: 'Nomnoml',
  codeBlockLanguages: ['nomnoml'],

  detect(container) {
    return container.querySelectorAll('code.language-nomnoml').length > 0;
  },

  async render(container, ctx) {
    const blocks = container.querySelectorAll('code.language-nomnoml');
    if (blocks.length === 0) return;

    try {
      await loadNomnoml();
    } catch (e) {
      console.warn('[AINote] Nomnoml 加载失败:', e);
      return;
    }

    for (const block of blocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;

      try {
        let svgText = '';
        if (typeof nomnoml !== 'undefined' && typeof nomnoml.renderSvg === 'function') {
          svgText = nomnoml.renderSvg(code);
        } else if (typeof nomnoml !== 'undefined') {
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 600;
          nomnoml.draw(canvas, code);

          const img = document.createElement('img');
          img.src = canvas.toDataURL();
          img.style.maxWidth = '100%';

          const wrapper = document.createElement('div');
          wrapper.className = 'ainote-nomnoml';
          wrapper.style.cssText = 'text-align:center;margin:16px 0;';
          wrapper.appendChild(img);
          pre.parentNode.replaceChild(wrapper, pre);
          continue;
        } else {
          throw new Error('Nomnoml 未定义');
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'ainote-nomnoml';
        wrapper.style.cssText = 'text-align:center;margin:16px 0;';
        wrapper.innerHTML = svgText;

        const svgEl = wrapper.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }

        pre.parentNode.replaceChild(wrapper, pre);
      } catch (err) {
        console.warn('[AINote] Nomnoml 渲染失败:', err);
        if (ctx.showError) {
          ctx.showError(pre, 'Nomnoml', err.message || String(err));
        } else {
          pre.classList.add('ainote-render-error');
          pre.innerHTML = `<code>⚠️ Nomnoml 渲染失败: ${err.message}</code>`;
        }
      }
    }
  },
});
