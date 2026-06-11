// ========== CSV / TSV 表格渲染器 ==========
// 将 .csv / .tsv 文件渲染为可排序、可搜索的交互式表格
(function() {
  'use strict';

  // 简单 CSV 解析（处理引号内的逗号）
  function parseCSV(text, delimiter) {
    var rows = [];
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;  // 跳过空行
      var row = [];
      var cell = '';
      var inQuotes = false;
      for (var j = 0; j < line.length; j++) {
        var ch = line[j];
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

  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  AINoteRenderers.registerStandalone({
    id: 'csv',
    name: 'CSV 表格',
    filePattern: '\\.(csv|tsv)$',
    dependencies: [],

    renderStandalone: async function(rawContent, ctx) {
      // 检测分隔符
      var path = window.location.pathname.toLowerCase();
      var delimiter = path.endsWith('.tsv') ? '\t' : ',';

      var rows = parseCSV(rawContent, delimiter);
      if (rows.length === 0) {
        document.body.innerHTML = '<div style="padding:32px;text-align:center;color:#666;">空文件或格式无法识别</div>';
        return;
      }

      var theme = ctx.settings.theme;
      var isDark = theme === 'dark';

      // 确定表头（第一行）+ 数据
      var headers = rows[0];
      var dataRows = rows.slice(1);

      // 构建表格 HTML
      var html = '<div style="max-width:100%;margin:0 auto;padding:16px;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;">';

      html += '<div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;">';
      html += '<h2 style="margin:0;font-size:18px;' +
        (isDark ? 'color:#c9d1d9;' : 'color:#24292f;') + '">' +
        '📊 ' + headers.length + ' 列 × ' + dataRows.length + ' 行</h2>';
      html += '<input id="ainote-csv-search" type="text" placeholder="🔍 搜索..." style="' +
        'padding:6px 12px;border-radius:6px;border:1px solid ' + (isDark ? '#30363d' : '#d0d7de') + ';' +
        'font-size:13px;' +
        (isDark ? 'background:#0d1117;color:#c9d1d9;' : 'background:#fff;color:#24292f;') + '">';
      html += '</div>';

      html += '<div style="overflow-x:auto;border-radius:8px;border:1px solid ' +
        (isDark ? '#30363d' : '#d0d7de') + ';">';
      html += '<table id="ainote-csv-table" style="width:100%;border-collapse:collapse;' +
        'font-size:13px;">';

      // 表头
      html += '<thead><tr style="' +
        (isDark ? 'background:#161b22;' : 'background:#f6f8fa;') + '">';
      for (var h = 0; h < headers.length; h++) {
        html += '<th data-col="' + h + '" style="padding:8px 12px;text-align:left;font-weight:600;' +
          'white-space:nowrap;cursor:pointer;user-select:none;' +
          'border-bottom:1px solid ' + (isDark ? '#30363d' : '#d0d7de') + ';' +
          (isDark ? 'color:#c9d1d9;' : 'color:#24292f;') + '">' +
          escapeHtml(headers[h]) + ' <span class="ainote-csv-sort" style="font-size:10px;"></span></th>';
      }
      html += '</tr></thead>';

      // 数据行
      html += '<tbody>';
      for (var r = 0; r < dataRows.length; r++) {
        var row = dataRows[r];
        html += '<tr data-row="' + r + '" style="' +
          (r % 2 === 0 ? (isDark ? 'background:#161b22;' : 'background:#fff;') :
                         (isDark ? 'background:#0d1117;' : 'background:#f6f8fa;')) + '">';
        // 填充少于表头的列
        for (var c = 0; c < headers.length; c++) {
          var val = c < row.length ? row[c] : '';
          html += '<td style="padding:6px 12px;white-space:nowrap;' +
            'border-bottom:1px solid ' + (isDark ? '#21262d' : '#d0d7de') + ';' +
            (isDark ? 'color:#c9d1d9;' : 'color:#24292f;') + '" ' +
            'data-value="' + escapeHtml(val) + '">' + escapeHtml(val) + '</td>';
        }
        html += '</tr>';
      }
      html += '</tbody></table></div>';

      // 分页控制
      var perPage = 50;
      var totalPages = Math.ceil(dataRows.length / perPage);
      if (totalPages > 1) {
        html += '<div style="margin-top:12px;text-align:center;font-size:13px;' +
          (isDark ? 'color:#8b949e;' : 'color:#57606a;') + '">';
        html += '<button id="ainote-csv-prev" style="' +
          'padding:4px 12px;border:1px solid ' + (isDark ? '#30363d' : '#d0d7de') + ';' +
          'border-radius:4px;margin:0 4px;cursor:pointer;' +
          (isDark ? 'background:#21262d;color:#c9d1d9;' : 'background:#f6f8fa;color:#24292f;') + '">' +
          '← 上一页</button>';
        html += ' <span id="ainote-csv-page">第 1 / ' + totalPages + ' 页</span> ';
        html += '<button id="ainote-csv-next" style="' +
          'padding:4px 12px;border:1px solid ' + (isDark ? '#30363d' : '#d0d7de') + ';' +
          'border-radius:4px;margin:0 4px;cursor:pointer;' +
          (isDark ? 'background:#21262d;color:#c9d1d9;' : 'background:#f6f8fa;color:#24292f;') + '">' +
          '下一页 →</button>';
        html += '</div>';
      }

      html += '</div>';

      document.body.innerHTML = html;
      document.body.style.margin = '0';
      document.body.style.padding = '0';

      // ========== 交互逻辑 ==========

      // 搜索功能
      var searchInput = document.getElementById('ainote-csv-search');
      var tbody = document.querySelector('#ainote-csv-table tbody');
      var rows = tbody ? tbody.querySelectorAll('tr') : [];

      if (searchInput) {
        searchInput.addEventListener('input', function() {
          var query = this.value.toLowerCase();
          for (var r = 0; r < rows.length; r++) {
            var text = rows[r].textContent.toLowerCase();
            rows[r].style.display = text.indexOf(query) !== -1 ? '' : 'none';
          }
        });
      }

      // 排序功能
      var ths = document.querySelectorAll('#ainote-csv-table th');
      var sortState = {};  // col index → 'asc' | 'desc' | null
      for (var th_i = 0; th_i < ths.length; th_i++) {
        (function(th) {
          th.addEventListener('click', function() {
            var col = parseInt(this.getAttribute('data-col'));
            var cur = sortState[col] || 'none';
            var next = cur === 'asc' ? 'desc' : cur === 'desc' ? 'none' : 'asc';

            // 清除其他列的排序标记
            sortState = {};
            sortState[col] = next;

            // 更新排序箭头
            var allSpans = document.querySelectorAll('.ainote-csv-sort');
            for (var s = 0; s < allSpans.length; s++) allSpans[s].textContent = '';
            var span = this.querySelector('.ainote-csv-sort');
            if (span) span.textContent = next === 'asc' ? ' ▲' : next === 'desc' ? ' ▼' : '';

            if (next === 'none') {
              // 恢复原始顺序
              for (var ri = 0; ri < rows.length; ri++) {
                tbody.appendChild(rows[ri]);
              }
            } else {
              // 排序
              var sortedRows = [];
              for (var rii = 0; rii < rows.length; rii++) sortedRows.push(rows[rii]);
              sortedRows.sort(function(a, b) {
                var aVal = (a.cells[col] && a.cells[col].textContent || '').toLowerCase();
                var bVal = (b.cells[col] && b.cells[col].textContent || '').toLowerCase();
                // 尝试数字排序
                var aNum = parseFloat(aVal), bNum = parseFloat(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) { aVal = aNum; bVal = bNum; }
                if (aVal < bVal) return next === 'asc' ? -1 : 1;
                if (aVal > bVal) return next === 'asc' ? 1 : -1;
                return 0;
              });
              for (var si = 0; si < sortedRows.length; si++) {
                tbody.appendChild(sortedRows[si]);
              }
            }
          });
        })(ths[th_i]);
      }

      // 分页
      if (totalPages > 1) {
        var currentPage = 1;
        var prevBtn = document.getElementById('ainote-csv-prev');
        var nextBtn = document.getElementById('ainote-csv-next');
        var pageLabel = document.getElementById('ainote-csv-page');

        function showPage(page) {
          for (var ri = 0; ri < rows.length; ri++) {
            var rowNum = parseInt(rows[ri].getAttribute('data-row'));
            rows[ri].style.display =
              (rowNum >= (page - 1) * perPage && rowNum < page * perPage) ? '' : 'none';
          }
          pageLabel.textContent = '第 ' + page + ' / ' + totalPages + ' 页';
        }

        prevBtn.addEventListener('click', function() {
          if (currentPage > 1) { currentPage--; showPage(currentPage); }
        });
        nextBtn.addEventListener('click', function() {
          if (currentPage < totalPages) { currentPage++; showPage(currentPage); }
        });

        // 初始：显示第一页，隐藏其余
        showPage(1);
      }
    }
  });

})();
