/**
 * CSV/TSV 表格渲染器
 */
import registry from './renderer-registry.js';

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseCSV(text, delimiter) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = [];
    let cell = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (inQuotes) {
        if (ch === '"') {
          if (j + 1 < line.length && line[j + 1] === '"') {
            cell += '"';
            j++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          row.push(cell.trim());
          cell = '';
        } else {
          cell += ch;
        }
      }
    }
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

registry.registerStandalone({
  id: 'csv',
  name: 'CSV 表格',
  filePattern: '\\.(csv|tsv)$',

  async renderStandalone(rawContent, ctx) {
    const pathname = ctx.fileName || '';
    const delimiter = pathname.endsWith('.tsv') ? '\t' : ',';
    const rows = parseCSV(rawContent, delimiter);

    if (rows.length === 0) {
      throw new Error('无有效数据行');
    }

    const theme = ctx.settings?.theme || 'light';
    const isDark = theme === 'dark';
    const header = rows[0];
    const data = rows.slice(1);

    let html = '<div class="ainote-csv-viewer" style="max-width:100%;overflow-x:auto;padding:16px;">';
    html += '<table class="ainote-csv-table" style="border-collapse:collapse;width:100%;">';

    // 表头
    html += '<thead><tr>';
    for (const h of header) {
      html += `<th style="
        position:sticky;top:0;padding:8px 12px;text-align:left;
        background:${isDark ? '#21262d' : '#f0f0f0'};
        color:${isDark ? '#c9d1d9' : '#24292f'};
        border:1px solid ${isDark ? '#30363d' : '#d0d7de'};
        font-weight:600;white-space:nowrap;
      ">${escapeHtml(h)}</th>`;
    }
    html += '</tr></thead><tbody>';

    // 数据行
    for (let i = 0; i < data.length; i++) {
      html += '<tr>';
      for (const cell of data[i]) {
        html += `<td style="
          padding:6px 12px;
          border:1px solid ${isDark ? '#30363d' : '#d0d7de'};
          color:${isDark ? '#c9d1d9' : '#24292f'};
          font-size:13px;
        ">${escapeHtml(cell)}</td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    html += `<div style="margin-top:8px;font-size:12px;color:${isDark ? '#8b949e' : '#57606a'};">${data.length} 行 &times; ${header.length} 列</div>`;
    html += '</div>';

    const container = ctx.container || document.body;
    container.innerHTML = html;
  },
});
