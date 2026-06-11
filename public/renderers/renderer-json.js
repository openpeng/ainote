// ========== JSON 增强查看器 ==========
// 将 .json 文件渲染为可折叠语法树
(function() {
  'use strict';

  AINoteRenderers.registerStandalone({
    id: 'jsonview',
    name: 'JSON 查看器',
    filePattern: '\\.json$',
    dependencies: [],

    renderStandalone: async function(rawContent, ctx) {
      var data;
      try {
        data = JSON.parse(rawContent);
      } catch (e) {
        throw new Error('JSON 格式错误: ' + e.message);
      }

      var theme = ctx.settings.theme;
      var isDark = theme === 'dark';

      // 构建 HTML
      var html = '<div style="max-width:900px;margin:0 auto;padding:24px;' +
        'font-family:SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;' +
        'font-size:13px;line-height:1.5;' +
        (isDark ? 'background:#0d1117;color:#c9d1d9;' : 'background:#fff;color:#24292f;') + '">';

      html += '<div style="margin-bottom:8px;font-size:11px;' +
        (isDark ? 'color:#8b949e;' : 'color:#57606a;') + '">';
      html += 'JSON • ' + new Date().toLocaleString();
      html += '</div>';

      html += renderNode(data, 0, isDark) + '</div>';

      function renderNode(obj, depth, isDark) {
        var indent = '  '.repeat(depth);
        var dark = isDark;

        if (obj === null) {
          return '<span style="color:' + (dark ? '#f0883e' : '#cf222e') + ';">null</span>';
        }
        if (typeof obj === 'boolean') {
          return '<span style="color:' + (dark ? '#79c0ff' : '#0550ae') + ';">' + obj + '</span>';
        }
        if (typeof obj === 'number') {
          return '<span style="color:' + (dark ? '#a5d6ff' : '#0550ae') + ';">' + obj + '</span>';
        }
        if (typeof obj === 'string') {
          return '<span style="color:' + (dark ? '#a5d6ff' : '#0a3069') + ';">"' +
            escapeJsonString(obj) + '"</span>';
        }

        if (Array.isArray(obj)) {
          if (obj.length === 0) {
            return '<span style="color:' + (dark ? '#8b949e' : '#57606a') + ';">[]</span>';
          }
          var id = 'json-arr-' + Math.random().toString(36).slice(2);
          var html = '<span class="ainote-json-toggle" data-target="' + id + '" ' +
            'style="cursor:pointer;color:' + (dark ? '#8b949e' : '#57606a') + ';">▼</span> ' +
            '<span style="color:' + (dark ? '#8b949e' : '#57606a') + ';">[</span>' +
            ' <span style="color:' + (dark ? '#8b949e' : '#57606a') + ';font-size:11px;">' +
            obj.length + ' items</span>' +
            '<div id="' + id + '" class="ainote-json-collapsed" style="padding-left:16px;">';
          for (var i = 0; i < obj.length; i++) {
            html += '<div>' + indent + '  <span style="color:' +
              (dark ? '#8b949e' : '#57606a') + ';">' + i + ':</span> ' +
              renderNode(obj[i], depth + 1, isDark) + '</div>';
          }
          html += '</div><span style="color:' + (dark ? '#8b949e' : '#57606a') + ';">]</span>';
          return html;
        }

        if (typeof obj === 'object') {
          var keys = Object.keys(obj);
          if (keys.length === 0) {
            return '<span style="color:' + (dark ? '#8b949e' : '#57606a') + ';">{}</span>';
          }
          var objId = 'json-obj-' + Math.random().toString(36).slice(2);
          var html2 = '<span class="ainote-json-toggle" data-target="' + objId + '" ' +
            'style="cursor:pointer;color:' + (dark ? '#8b949e' : '#57606a') + ';">▼</span> ' +
            '<span style="color:' + (dark ? '#8b949e' : '#57606a') + ';">{</span>' +
            ' <span style="color:' + (dark ? '#8b949e' : '#57606a') + ';font-size:11px;">' +
            keys.length + ' keys</span>' +
            '<div id="' + objId + '" class="ainote-json-collapsed" style="padding-left:16px;">';
          for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            html2 += '<div>' + indent + '  <span style="color:' +
              (dark ? '#7ee787' : '#1a7f37') + ';">"' + escapeJsonString(key) + '"</span>' +
              '<span style="color:' + (dark ? '#8b949e' : '#57606a') + ';">:</span> ' +
              renderNode(obj[key], depth + 1, isDark) + '</div>';
          }
          html2 += '</div><span style="color:' + (dark ? '#8b949e' : '#57606a') + ';">}</span>';
          return html2;
        }

        return '<span>' + String(obj) + '</span>';
      }

      function escapeJsonString(str) {
        return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
          .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      }

      document.body.innerHTML = html;
      document.body.style.margin = '0';
      document.body.style.padding = '0';

      // ========== 折叠/展开交互 ==========
      var toggles = document.querySelectorAll('.ainote-json-toggle');
      for (var t = 0; t < toggles.length; t++) {
        (function(toggle) {
          toggle.addEventListener('click', function() {
            var targetId = this.getAttribute('data-target');
            var target = document.getElementById(targetId);
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
        })(toggles[t]);
      }
    }
  });

})();
