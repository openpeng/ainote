/**
 * AsciiDoc (.adoc/.asciidoc) 渲染器
 */
import Asciidoctor from 'asciidoctor';
import registry from './renderer-registry.js';
import pipeline from './render-pipeline.js';

registry.registerStandalone({
  id: 'adoc',
  name: 'AsciiDoc',
  filePattern: '\\.(adoc|asciidoc)$',

  async renderStandalone(rawContent, ctx) {
    const theme = ctx.settings?.theme || 'light';
    const isDark = theme === 'dark';
    const fontSize = ctx.settings?.fontSize || 16;

    const asciidoctor = Asciidoctor();
    const doc = asciidoctor.load(rawContent, {
      safe: 'safe',
      attributes: {
        'source-highlighter': 'highlight.js',
        icons: 'font',
        setanchors: true,
        toc: 'auto',
      },
    });

    const html = doc.convert();

    const container = ctx.container || document.body;
    container.innerHTML = `<div class="ainote-adoc" style="
      max-width:900px;margin:0 auto;padding:32px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
      font-size:${fontSize}px;line-height:1.6;
      ${isDark ? 'background:#0d1117;color:#c9d1d9;' : 'background:#fff;color:#24292f;'}
    ">${html}</div>`;

    // 尝试用管道渲染嵌入的图表
    try {
      await pipeline.run(container, ctx);
    } catch (e) { /* ignore */ }
  },
});
