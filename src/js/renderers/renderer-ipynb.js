/**
 * Jupyter Notebook (.ipynb) 渲染器
 */
import registry from './renderer-registry.js';
import pipeline from './render-pipeline.js';

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizeSource(source) {
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) return source.join('');
  return '';
}

registry.registerStandalone({
  id: 'ipynb',
  name: 'Jupyter Notebook',
  filePattern: '\\.ipynb$',

  async renderStandalone(rawContent, ctx) {
    let notebook;
    try {
      notebook = JSON.parse(rawContent);
    } catch (e) {
      throw new Error('无法解析 Jupyter Notebook: ' + e.message);
    }
    if (!notebook.cells) {
      throw new Error('无效的 Jupyter Notebook 格式');
    }

    const theme = ctx.settings?.theme || 'light';
    const isDark = theme === 'dark';
    const dark = isDark;

    const css = {
      pageBg: dark ? '#0d1117' : '#ffffff',
      textColor: dark ? '#c9d1d9' : '#24292f',
      cellBorder: '1px solid ' + (dark ? '#21262d' : '#d0d7de'),
      gutterWidth: '64px',
      gutterColor: dark ? '#8b949e' : '#57606a',
      gutterBg: dark ? '#161b22' : '#f6f8fa',
      inputBg: dark ? '#0d1117' : '#f6f8fa',
      outputBg: dark ? '#0d1117' : '#ffffff',
      outputBorder: dark ? '#30363d' : '#d0d7de',
      errorBg: dark ? '#490202' : '#ffebe9',
      errorColor: dark ? '#f0883e' : '#cf222e',
      streamColor: dark ? '#c9d1d9' : '#24292f',
      gutterBorder: dark ? '#30363d' : '#d0d7de',
    };

    let html = '';
    for (let i = 0; i < notebook.cells.length; i++) {
      const cell = notebook.cells[i];
      html += renderCell(cell, i, css, ctx);
    }

    html += '</div>';

    const container = ctx.container || document.body;
    container.innerHTML = `<div class="ainote-ipynb" style="
      max-width:900px;margin:0 auto;padding:24px 0;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
      font-size:14px;line-height:1.6;
      background:${css.pageBg};color:${css.textColor};
    ">${html}</div>`;

    // 尝试用管道渲染嵌入的图表
    try {
      await pipeline.run(container, ctx);
    } catch (e) { /* ignore */ }
  },
});

function renderCell(cell, index, css, ctx) {
  const cellType = cell.cell_type;
  const source = normalizeSource(cell.source || '');

  if (cellType === 'markdown') {
    return `<div style="padding:12px 16px;border-left:3px solid transparent;">
      <div style="font-size:14px;color:${css.textColor};">${ctx.escapeHtml ? ctx.escapeHtml(source) : escapeHtml(source)}</div>
    </div>`;
  }

  if (cellType === 'code') {
    let html = `<div style="border:${css.cellBorder};border-radius:6px;margin:8px 0;overflow:hidden;">`;

    // 输入区域
    html += `<div style="display:flex;align-items:stretch;min-height:32px;">
      <div style="flex-shrink:0;width:${css.gutterWidth};background:${css.gutterBg};
        padding:8px 12px;text-align:right;font-size:12px;color:${css.gutterColor};
        font-family:SFMono-Regular,Consolas,monospace;
        border-right:1px solid ${css.gutterBorder};
        user-select:none;">
        In[${cell.execution_count != null ? cell.execution_count : ' '}]:
      </div>
      <div style="flex:1;min-width:0;overflow-x:auto;">
        <pre style="margin:0;padding:8px 16px;font-size:13px;line-height:1.5;
          font-family:SFMono-Regular,Consolas,monospace;
          color:${css.textColor};white-space:pre;overflow-x:auto;">
          <code>${ctx.escapeHtml ? ctx.escapeHtml(source) : escapeHtml(source)}</code></pre>
      </div>
    </div>`;

    // 输出区域
    if (cell.outputs && cell.outputs.length > 0) {
      for (const output of cell.outputs) {
        html += renderOutput(output, cell, css, ctx);
      }
    }

    html += '</div>';
    return html;
  }

  if (cellType === 'raw') {
    return `<div style="padding:8px 16px;">
      <pre style="white-space:pre-wrap;margin:0;font-size:13px;color:${css.gutterColor};font-style:italic;">
        ${ctx.escapeHtml ? ctx.escapeHtml(source) : escapeHtml(source)}</pre>
    </div>`;
  }

  return '';
}

function renderOutput(output, cell, css, ctx) {
  if (output.output_type === 'stream') {
    const text = Array.isArray(output.text) ? output.text.join('') : (output.text || '');
    const isStderr = output.name === 'stderr';
    return `<div style="border-top:1px solid ${css.outputBorder};padding:8px 16px;
      ${isStderr ? 'background:' + css.errorBg : 'background:' + css.outputBg};">
      <pre style="margin:0;white-space:pre-wrap;font-size:13px;line-height:1.5;
        font-family:SFMono-Regular,Consolas,monospace;
        color:${isStderr ? css.errorColor : css.streamColor};">
        ${ctx.escapeHtml ? ctx.escapeHtml(text) : escapeHtml(text)}</pre>
    </div>`;
  }

  if (output.output_type === 'execute_result') {
    return `<div style="border-top:1px solid ${css.outputBorder};">
      <div style="display:flex;">
        <div style="flex-shrink:0;width:${css.gutterWidth};background:${css.gutterBg};
          padding:8px 12px;text-align:right;font-size:12px;color:${css.gutterColor};
          font-family:SFMono-Regular,Consolas,monospace;
          border-right:1px solid ${css.gutterBorder};user-select:none;">
          Out[${cell.execution_count != null ? cell.execution_count : ' '}]:
        </div>
        <div style="flex:1;min-width:0;padding:8px 16px;">
          ${renderOutputData(output.data, css, ctx)}
        </div>
      </div></div>`;
  }

  if (output.output_type === 'display_data') {
    return `<div style="border-top:1px solid ${css.outputBorder};padding:12px 16px;
      text-align:center;background:${css.outputBg};">
      ${renderOutputData(output.data, css, ctx)}
    </div>`;
  }

  if (output.output_type === 'error') {
    const traceback = Array.isArray(output.traceback) ? output.traceback.join('\n') : (output.traceback || '');
    return `<div style="border-top:1px solid ${css.outputBorder};padding:12px 16px;background:${css.errorBg};">
      <pre style="margin:0;font-size:12px;line-height:1.5;font-family:SFMono-Regular,Consolas,monospace;
        white-space:pre-wrap;overflow-x:auto;color:${css.errorColor};">
        ${ctx.escapeHtml ? ctx.escapeHtml(traceback) : escapeHtml(traceback)}</pre>
    </div>`;
  }

  return '';
}

function renderOutputData(data, css, ctx) {
  if (!data) return '';
  let html = '';

  if (data['text/html']) {
    const htmlData = Array.isArray(data['text/html']) ? data['text/html'].join('') : data['text/html'];
    html += `<iframe srcdoc="${ctx.escapeHtml ? ctx.escapeHtml(htmlData) : escapeHtml(htmlData)}"
      style="width:100%;border:none;min-height:80px;background:${css.outputBg};"
      sandbox="allow-scripts allow-same-origin"></iframe>`;
  }

  if (data['image/png']) {
    html += `<img src="data:image/png;base64,${data['image/png']}"
      style="max-width:100%;margin:4px 0;display:block;" />`;
  }
  if (data['image/jpeg']) {
    html += `<img src="data:image/jpeg;base64,${data['image/jpeg']}"
      style="max-width:100%;margin:4px 0;display:block;" />`;
  }
  if (data['image/svg+xml']) {
    const svgRaw = Array.isArray(data['image/svg+xml']) ? data['image/svg+xml'].join('') : data['image/svg+xml'];
    html += `<div style="margin:4px 0;">${svgRaw}</div>`;
  }

  if (data['text/plain']) {
    const plainText = Array.isArray(data['text/plain']) ? data['text/plain'].join('') : data['text/plain'];
    html += `<pre style="margin:4px 0 0 0;white-space:pre-wrap;font-size:13px;line-height:1.5;
      font-family:SFMono-Regular,Consolas,monospace;color:${css.textColor};">
      ${ctx.escapeHtml ? ctx.escapeHtml(plainText) : escapeHtml(plainText)}</pre>`;
  }

  return html || '<span style="color:' + css.gutterColor + ';">&lt;empty output&gt;</span>';
}
