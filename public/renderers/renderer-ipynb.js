// ========== Jupyter Notebook (.ipynb) 渲染器 ==========
// 解析 .ipynb JSON 文件 → 格式化的 HTML 页面
(function() {
  'use strict';

  // 规范化 cell source（nbformat v4+: 数组, 旧版: 字符串）
  function normalizeSource(source) {
    if (typeof source === 'string') return source;
    if (Array.isArray(source)) return source.join('');
    return '';
  }

  AINoteRenderers.registerStandalone({
    id: 'ipynb',
    name: 'Jupyter Notebook',
    filePattern: '\\.ipynb$',
    dependencies: [],

    renderStandalone: async function(rawContent, ctx) {
      var notebook;
      try {
        notebook = JSON.parse(rawContent);
      } catch (e) {
        throw new Error('无法解析 Jupyter Notebook JSON: ' + e.message);
      }

      if (!notebook.cells) {
        throw new Error('无效的 Jupyter Notebook 格式：缺少 cells 字段');
      }

      var theme = ctx.settings.theme;
      var isDark = theme === 'dark';
      var dark = isDark;

      // 构建内联样式表，避免重复字符串拼接
      var css = {
        // 页面容器
        pageBg: dark ? '#0d1117' : '#ffffff',
        textColor: dark ? '#c9d1d9' : '#24292f',
        // cell 容器
        cellBg: dark ? '#0d1117' : '#ffffff',
        cellBorder: '1px solid ' + (dark ? '#21262d' : '#d0d7de'),
        // 左侧装订线 (gutter)
        gutterWidth: '64px',
        gutterColor: dark ? '#8b949e' : '#57606a',
        gutterBg: dark ? '#161b22' : '#f6f8fa',
        // 输入区域 (code input)
        inputBg: dark ? '#0d1117' : '#f6f8fa',
        // 输出区域
        outputBg: dark ? '#0d1117' : '#ffffff',
        outputBorder: dark ? '#30363d' : '#d0d7de',
        // 错误输出
        errorBg: dark ? '#490202' : '#ffebe9',
        errorColor: dark ? '#f0883e' : '#cf222e',
        // 文本输出
        streamColor: dark ? '#c9d1d9' : '#24292f',
        stderrColor: dark ? '#f0883e' : '#cf222e',
        // gutter 分隔线
        gutterBorder: dark ? '#30363d' : '#d0d7de',
        // 输出区域分隔
        outputBorder: dark ? '#30363d' : '#d0d7de',
        // border 圆角
        radius: '6px'
      };

      var html = '';

      // 渲染每个 cell
      for (var i = 0; i < notebook.cells.length; i++) {
        var cell = notebook.cells[i];
        var cellType = cell.cell_type;
        var source = normalizeSource(cell.source || '');

        html += renderCell(cell, cellType, source, i, css, ctx);
      }

      // 构建页面
      var container = document.createElement('div');
      container.id = 'ainote-ipynb-rendered';
      container.style.cssText =
        'max-width:900px;margin:0 auto;padding:24px 0;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;' +
        'font-size:14px;line-height:1.6;' +
        'background:' + css.pageBg + ';color:' + css.textColor + ';';

      container.innerHTML = html;
      document.body.innerHTML = '';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.background = css.pageBg;
      document.body.appendChild(container);

      // 高亮代码块
      if (typeof hljs !== 'undefined') {
        var codeBlocks = container.querySelectorAll('pre code');
        for (var c = 0; c < codeBlocks.length; c++) {
          try { hljs.highlightElement(codeBlocks[c]); } catch (e) {}
        }
      }

      // 渲染 Markdown cell 中的图表和公式
      if (typeof AINotePipeline !== 'undefined') {
        var pipelineCtx = {
          settings: ctx.settings,
          escapeHtml: ctx.escapeHtml,
          loadScript: ctx.loadScript,
          loadCSS: ctx.loadCSS,
          getLocalUrl: ctx.getLocalUrl,
          getPlantUmlServerList: ctx.getPlantUmlServerList,
          showError: ctx.showError
        };
        try { await AINotePipeline.run(container, pipelineCtx); } catch (e) {}
      }
    }
  });

  // ========== Cell 渲染函数 ==========

  // Flexbox 布局: [gutter | content]
  // gutter: 执行计数 In[N] / Out[N]
  // content: 代码块 / 输出 / Markdown

  function renderCell(cell, cellType, source, index, css, ctx) {
    var html = '';
    var cellClass = 'ainote-ipynb-cell-' + index;

    if (cellType === 'markdown') {
      html += renderMarkdownCell(source, css, ctx);
    } else if (cellType === 'code') {
      html += renderCodeCell(cell, source, index, css, ctx);
    } else if (cellType === 'raw') {
      html += renderRawCell(source, css, ctx);
    }

    return html;
  }

  function renderMarkdownCell(source, css, ctx) {
    var html = '';

    html += '<div class="ainote-ipynb-cell ainote-ipynb-md" style="' +
      'padding:12px 16px;' +
      'border-left:3px solid transparent;">';

    if (typeof markdownit !== 'undefined') {
      var md = window.markdownit({ html: true, linkify: true, breaks: true });
      html += md.render(source);
    } else {
      html += '<pre style="white-space:pre-wrap;margin:0;' +
        'font-size:14px;color:' + css.textColor + '">' +
        ctx.escapeHtml(source) + '</pre>';
    }

    html += '</div>';
    return html;
  }

  function renderCodeCell(cell, source, index, css, ctx) {
    var html = '';

    html += '<div class="ainote-ipynb-cell ainote-ipynb-code" style="' +
      'border:' + css.cellBorder + ';border-radius:' + css.radius + ';' +
      'margin:8px 0;overflow:hidden;">';

    // ---- 输入区域 (In[N]: + 代码) ----
    html += '<div class="ainote-ipynb-input" style="display:flex;align-items:stretch;min-height:32px;">';

    // 左侧 gutter
    html += '<div class="ainote-ipynb-gutter" style="' +
      'flex-shrink:0;width:' + css.gutterWidth + ';' +
      'background:' + css.gutterBg + ';' +
      'padding:8px 12px;text-align:right;' +
      'font-size:12px;color:' + css.gutterColor + ';' +
      'font-family:SFMono-Regular,Consolas,monospace;' +
      'border-right:1px solid ' + css.gutterBorder + ';' +
      'user-select:none;' +
      'display:flex;align-items:flex-start;justify-content:flex-end;' +
      '">' +
      'In [' + (cell.execution_count != null ? cell.execution_count : ' ') + ']:' +
      '</div>';

    // 右侧代码区域
    html += '<div class="ainote-ipynb-code-area" style="flex:1;min-width:0;overflow-x:auto;">' +
      '<pre style="margin:0;padding:8px 16px;' +
      'font-size:13px;line-height:1.5;' +
      'font-family:SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;' +
      'color:' + css.textColor + ';' +
      'white-space:pre;overflow-x:auto;' +
      '">' +
      '<code>' + ctx.escapeHtml(source) + '</code></pre>' +
      '</div>';

    html += '</div>'; // .ainote-ipynb-input

    // ---- 输出区域 ----
    html += renderOutputs(cell, index, css, ctx);

    html += '</div>'; // .ainote-ipynb-cell
    return html;
  }

  function renderOutputs(cell, index, css, ctx) {
    if (!cell.outputs || cell.outputs.length === 0) return '';

    var html = '';

    for (var o = 0; o < cell.outputs.length; o++) {
      var output = cell.outputs[o];

      if (output.output_type === 'stream') {
        // stdout/stderr 文本输出
        var outText = Array.isArray(output.text) ? output.text.join('') : (output.text || '');
        var isStderr = output.name === 'stderr';
        html += '<div class="ainote-ipynb-output-stream" style="' +
          'border-top:1px solid ' + css.outputBorder + ';' +
          'padding:8px 16px 8px 16px;' +
          (isStderr ? 'background:' + css.errorBg + ';' : 'background:' + css.outputBg + ';') +
          '">' +
          '<pre style="margin:0;white-space:pre-wrap;font-size:13px;line-height:1.5;' +
          'font-family:SFMono-Regular,Consolas,monospace;' +
          'color:' + (isStderr ? css.stderrColor : css.streamColor) + ';">' +
          ctx.escapeHtml(outText) + '</pre>' +
          '</div>';
      } else if (output.output_type === 'execute_result') {
        // 执行结果 (Out[N]: + 输出)
        html += '<div class="ainote-ipynb-output-result" style="' +
          'border-top:1px solid ' + css.outputBorder + ';">' +
          '<div style="display:flex;">' +
          // gutter
          '<div class="ainote-ipynb-gutter" style="' +
          'flex-shrink:0;width:' + css.gutterWidth + ';' +
          'background:' + css.gutterBg + ';' +
          'padding:8px 12px;text-align:right;' +
          'font-size:12px;color:' + css.gutterColor + ';' +
          'font-family:SFMono-Regular,Consolas,monospace;' +
          'border-right:1px solid ' + css.gutterBorder + ';' +
          'user-select:none;' +
          '">' +
          'Out[' + (cell.execution_count != null ? cell.execution_count : ' ') + ']:' +
          '</div>' +
          // 输出内容
          '<div class="ainote-ipynb-output-content" style="flex:1;min-width:0;padding:8px 16px;">' +
          renderOutputData(output.data, css, ctx) +
          '</div>' +
          '</div></div>';
      } else if (output.output_type === 'display_data') {
        // 显示数据 (plot / image 等)
        html += '<div class="ainote-ipynb-output-display" style="' +
          'border-top:1px solid ' + css.outputBorder + ';' +
          'padding:12px 16px;text-align:center;' +
          'background:' + css.outputBg + ';">' +
          renderOutputData(output.data, css, ctx) +
          '</div>';
      } else if (output.output_type === 'error') {
        // 错误输出
        var traceback = Array.isArray(output.traceback) ? output.traceback.join('\n') : (output.traceback || '');
        html += '<div class="ainote-ipynb-output-error" style="' +
          'border-top:1px solid ' + css.outputBorder + ';' +
          'padding:12px 16px;' +
          'background:' + css.errorBg + ';">' +
          '<pre style="margin:0;font-size:12px;line-height:1.5;' +
          'font-family:SFMono-Regular,Consolas,monospace;' +
          'white-space:pre-wrap;overflow-x:auto;' +
          'color:' + css.errorColor + ';">' +
          ctx.escapeHtml(traceback) +
          '</pre></div>';
      }
    }

    return html;
  }

  function renderOutputData(data, css, ctx) {
    if (!data) return '';
    var html = '';

    // 纯文本 (通常放在最后，先渲染富媒体)
    var textParts = [];

    // HTML 输出（使用沙箱 iframe）
    if (data['text/html']) {
      var htmlData = Array.isArray(data['text/html']) ? data['text/html'].join('') : data['text/html'];
      html += '<iframe srcdoc="' + ctx.escapeHtml(htmlData) + '" ' +
        'style="width:100%;border:none;min-height:80px;' +
        'background:' + css.outputBg + ';" ' +
        'sandbox="allow-scripts allow-same-origin"></iframe>';
    }

    // 图片
    if (data['image/png']) {
      html += '<img src="data:image/png;base64,' + data['image/png'] + '" ' +
        'style="max-width:100%;margin:4px 0;display:block;" />';
    }
    if (data['image/jpeg']) {
      html += '<img src="data:image/jpeg;base64,' + data['image/jpeg'] + '" ' +
        'style="max-width:100%;margin:4px 0;display:block;" />';
    }
    if (data['image/svg+xml']) {
      var svgRaw = Array.isArray(data['image/svg+xml']) ? data['image/svg+xml'].join('') : data['image/svg+xml'];
      html += '<div style="margin:4px 0;">' + svgRaw + '</div>';
    }

    // 纯文本（在富媒体之后）
    if (data['text/plain']) {
      var plainText = Array.isArray(data['text/plain']) ? data['text/plain'].join('') : data['text/plain'];
      html += '<pre style="margin:4px 0 0 0;white-space:pre-wrap;font-size:13px;line-height:1.5;' +
        'font-family:SFMono-Regular,Consolas,monospace;' +
        'color:' + css.textColor + ';">' +
        ctx.escapeHtml(plainText) + '</pre>';
    }

    return html || '<span style="color:' + css.gutterColor + ';">&lt;empty output&gt;</span>';
  }

  function renderRawCell(source, css, ctx) {
    return '<div class="ainote-ipynb-cell ainote-ipynb-raw" style="' +
      'padding:8px 16px;">' +
      '<pre style="white-space:pre-wrap;margin:0;font-size:13px;' +
      'color:' + css.gutterColor + ';font-style:italic;">' +
      ctx.escapeHtml(source) + '</pre>' +
      '</div>';
  }

})();
