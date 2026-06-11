/**
 * JSON 增强查看器（可折叠语法树）
 */
import registry from './renderer-registry.js';

registry.registerStandalone({
  id: 'jsonview',
  name: 'JSON 查看器',
  filePattern: '\\.json$',

  async renderStandalone(rawContent, ctx) {
    let data;
    try {
      data = JSON.parse(rawContent);
    } catch (e) {
      throw new Error('JSON 格式错误: ' + e.message);
    }

    const theme = ctx.settings?.theme || 'light';
    const isDark = theme === 'dark';

    const container = ctx.container || document.body;
    container.innerHTML = renderTree(data, isDark);

    // 绑定折叠/展开
    container.querySelectorAll('.ainote-json-toggle').forEach(toggle => {
      toggle.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const target = document.getElementById(targetId);
        if (target) {
          if (target.style.display === 'none') {
            target.style.display = 'block';
            this.textContent = '▼';
          } else {
            target.style.display = 'none';
            this.textContent = '▶';
          }
        }
      });
    });
  },
});

function escapeJsonString(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function renderTree(data, isDark) {
  return `<div class="ainote-json-viewer" style="
    max-width:900px;margin:0 auto;padding:24px;
    font-family:SFMono-Regular,Consolas,monospace;font-size:13px;line-height:1.5;
    ${isDark ? 'background:#0d1117;color:#c9d1d9;' : 'background:#fff;color:#24292f;'}
  ">
    <div style="margin-bottom:8px;font-size:11px;${isDark ? 'color:#8b949e;' : 'color:#57606a;'}">
      JSON &bull; ${new Date().toLocaleString()}
    </div>
    ${renderNode(data, 0, isDark)}
  </div>`;
}

function renderNode(obj, depth, isDark) {
  if (obj === null) {
    return `<span style="color:${isDark ? '#f0883e' : '#cf222e'};">null</span>`;
  }
  if (typeof obj === 'boolean') {
    return `<span style="color:${isDark ? '#79c0ff' : '#0550ae'};">${obj}</span>`;
  }
  if (typeof obj === 'number') {
    return `<span style="color:${isDark ? '#a5d6ff' : '#0550ae'};">${obj}</span>`;
  }
  if (typeof obj === 'string') {
    return `<span style="color:${isDark ? '#a5d6ff' : '#0a3069'};">"${escapeJsonString(obj)}"</span>`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return `<span style="color:${isDark ? '#8b949e' : '#57606a'};">[]</span>`;
    }
    const id = 'json-arr-' + Math.random().toString(36).slice(2);
    let html = `<span class="ainote-json-toggle" data-target="${id}"
      style="cursor:pointer;color:${isDark ? '#8b949e' : '#57606a'};">▼</span>
      <span style="color:${isDark ? '#8b949e' : '#57606a'};">[</span>
      <span style="color:${isDark ? '#8b949e' : '#57606a'};font-size:11px;">${obj.length} items</span>
      <div id="${id}" style="padding-left:16px;">`;
    for (let i = 0; i < obj.length; i++) {
      html += `<div><span style="color:${isDark ? '#8b949e' : '#57606a'};">${i}:</span> ${renderNode(obj[i], depth + 1, isDark)}</div>`;
    }
    html += `</div><span style="color:${isDark ? '#8b949e' : '#57606a'};">]</span>`;
    return html;
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return `<span style="color:${isDark ? '#8b949e' : '#57606a'};">{}</span>`;
    }
    const objId = 'json-obj-' + Math.random().toString(36).slice(2);
    let html = `<span class="ainote-json-toggle" data-target="${objId}"
      style="cursor:pointer;color:${isDark ? '#8b949e' : '#57606a'};">▼</span>
      <span style="color:${isDark ? '#8b949e' : '#57606a'};">{</span>
      <span style="color:${isDark ? '#8b949e' : '#57606a'};font-size:11px;">${keys.length} keys</span>
      <div id="${objId}" style="padding-left:16px;">`;
    for (const key of keys) {
      html += `<div><span style="color:${isDark ? '#7ee787' : '#1a7f37'};">"${escapeJsonString(key)}"</span>
        <span style="color:${isDark ? '#8b949e' : '#57606a'};">:</span> ${renderNode(obj[key], depth + 1, isDark)}</div>`;
    }
    html += `</div><span style="color:${isDark ? '#8b949e' : '#57606a'};">}</span>`;
    return html;
  }

  return `<span>${String(obj)}</span>`;
}
