/**
 * PlantUML 图表渲染器（动态多服务器）
 */
import pako from 'pako';
import registry from './renderer-registry.js';

const PLANTUML_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const STANDARD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const OFFICIAL_SERVER = 'https://www.plantuml.com/plantuml';

function plantUmlEncode(text) {
  const utf8Bytes = new TextEncoder().encode(text);
  const compressed = pako.deflateRaw(utf8Bytes, { level: 9 });
  const standardBase64 = btoa(String.fromCharCode(...compressed));

  let plantUml = '';
  for (let i = 0; i < standardBase64.length; i++) {
    const c = standardBase64[i];
    if (c === '=') continue;
    const idx = STANDARD_ALPHABET.indexOf(c);
    if (idx !== -1) plantUml += PLANTUML_ALPHABET[idx];
  }
  return plantUml;
}

function getServerList(settings) {
  const servers = [OFFICIAL_SERVER];
  if (settings.plantUmlCustomServer) {
    servers.push(settings.plantUmlCustomServer.replace(/\/+$/, ''));
  }
  return [...new Set(servers)];
}

async function loadWithFallback(pre, code, imgUrls, theme) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ainote-plantuml';
  wrapper.style.cssText = 'text-align:center;margin:16px 0;padding:16px;border-radius:8px;';
  wrapper.style.background = theme === 'dark' ? '#161b22' : '#f6f8fa';
  wrapper.innerHTML = '<div style="font-size:12px;color:#888;">⏳ PlantUML 加载中...</div>';
  pre.parentNode.replaceChild(wrapper, pre);

  for (const url of imgUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(url, { mode: 'cors', signal: controller.signal });
      clearTimeout(timeout);

      if (!resp.ok) continue;
      const svgText = await resp.text();
      if (!svgText || !svgText.includes('<svg')) continue;

      wrapper.innerHTML = svgText;
      const svgEl = wrapper.querySelector('svg');
      if (svgEl) {
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
      }
      return;
    } catch (e) {
      console.warn('[AINote] PlantUML 服务器', url, '失败:', e.message);
    }
  }

  // 所有服务器都失败
  const escaped = (ctx => ctx && ctx.escapeHtml ? ctx.escapeHtml(code) : code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))();
  const isDark = theme === 'dark';
  wrapper.innerHTML = `
    <div style="background:#d73a49;color:#fff;padding:8px 16px;font-size:13px;font-weight:600;border-radius:8px 8px 0 0;margin:-16px -16px 0 -16px;">
      ⚠️ PlantUML 渲染失败
    </div>
    <div style="padding:12px 0;font-size:13px;color:${isDark ? '#e1e4e8' : '#24292f'};">
      <div style="margin-bottom:12px;"><strong>错误原因：</strong>所有 PlantUML 服务器均不可达</div>
      <details style="cursor:pointer;">
        <summary>查看原始代码</summary>
        <pre style="background:${isDark ? '#0d1117' : '#f6f8fa'};padding:12px;border-radius:6px;overflow:auto;max-height:300px;margin:0;">
          <code>${escaped}</code></pre>
      </details>
    </div>`;
}

registry.register({
  id: 'plantuml',
  name: 'PlantUML',
  codeBlockLanguages: ['plantuml', 'uml'],

  detect(container) {
    return container.querySelectorAll('code.language-plantuml, code.language-uml').length > 0;
  },

  async render(container, ctx) {
    const blocks = container.querySelectorAll('code.language-plantuml, code.language-uml');
    if (blocks.length === 0) return;

    const theme = ctx.settings?.theme || 'light';
    const servers = ctx.settings ? getServerList(ctx.settings) : [OFFICIAL_SERVER];

    for (const block of blocks) {
      const pre = block.closest('pre');
      if (!pre) continue;

      const code = block.textContent;
      let encoded;
      try {
        encoded = plantUmlEncode(code);
      } catch (e) {
        console.warn('[AINote] PlantUML 编码失败:', e);
        pre.classList.add('ainote-render-error');
        pre.innerHTML = '<code>⚠️ PlantUML 编码失败</code>';
        continue;
      }

      const imgUrls = servers.map(s => `${s}/svg/${encoded}`);
      const firstUrl = imgUrls[0];
      if (firstUrl.length > 8000) {
        pre.classList.add('ainote-render-error');
        pre.innerHTML = '<code>⚠️ PlantUML 图表过大，请拆分后重试</code>';
        continue;
      }

      await loadWithFallback(pre, code, imgUrls, theme);
    }
  },
});
