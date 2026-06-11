// ========== PlantUML 图表渲染器 ==========
(function() {
  'use strict';

  // PlantUML 编码常量
  var PLANTUML_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  var STANDARD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  // Uint8Array → 标准 Base64（分块方式，避免栈溢出）
  function uint8ToBase64(bytes) {
    var binary = '';
    var chunk = 8192;
    for (var i = 0; i < bytes.length; i += chunk) {
      var slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
      binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
  }

  // PlantUML 编码: UTF-8 → deflate → Base64 → PlantUML 字母表
  function plantUmlEncode(text) {
    var utf8Bytes = new TextEncoder().encode(text);

    var compressed;
    if (typeof pako !== 'undefined') {
      try {
        compressed = pako.deflateRaw(utf8Bytes, { level: 9 });
      } catch (e) {
        console.warn('AINote PlantUML deflate 失败，使用未压缩文本:', e);
        compressed = utf8Bytes;
      }
    } else {
      compressed = utf8Bytes;
    }

    var standardBase64 = uint8ToBase64(compressed);

    var plantUml = '';
    for (var i = 0; i < standardBase64.length; i++) {
      var c = standardBase64[i];
      if (c === '=') continue;
      var idx = STANDARD_ALPHABET.indexOf(c);
      if (idx !== -1) {
        plantUml += PLANTUML_ALPHABET[idx];
      }
    }

    var fullUrl = 'https://www.plantuml.com/plantuml/svg/' + plantUml;
    if (fullUrl.length > 8000) {
      console.warn(
        'AINote PlantUML: URL 长度 ' + fullUrl.length + ' 超过建议值 8000，' +
        '图表可能显示失败。建议拆分较大的 PlantUML 图。'
      );
    }
    return plantUml;
  }

  // 多服务器 fallback 加载 PlantUML SVG
  async function loadPlantUmlWithFallback(pre, code, imgUrls, ctx) {
    var wrapper = document.createElement('div');
    wrapper.className = 'plantuml-chart';
    wrapper.style.cssText = 'text-align:center;margin:16px 0;padding:16px;border-radius:8px;';

    if (ctx.settings.theme === 'dark') {
      wrapper.style.background = '#161b22';
      wrapper.style.color = '#c9d1d9';
    } else {
      wrapper.style.background = '#f6f8fa';
      wrapper.style.color = '#24292e';
    }

    wrapper.innerHTML = '<div style="font-size:12px;color:#888;">⏳ PlantUML 加载中...</div>';

    if (pre && pre.parentNode) {
      pre.parentNode.replaceChild(wrapper, pre);
    }

    // 依次尝试每个服务器
    for (var i = 0; i < imgUrls.length; i++) {
      var url = imgUrls[i];
      try {
        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 8000);

        var resp = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!resp.ok) continue;

        var svgText = await resp.text();
        if (!svgText || !svgText.includes('<svg')) continue;

        // 成功
        wrapper.innerHTML = svgText;
        var svgEl = wrapper.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
        return;
      } catch (e) {
        console.warn('AINote PlantUML 服务器 ' + url + ' 失败:', e.message);
      }
    }

    // 所有服务器失败 → 显示错误卡片
    var isDark = ctx.settings.theme === 'dark';
    var escapedCode = ctx.escapeHtml(code);
    wrapper.innerHTML =
      '<div style="background:#d73a49;color:#fff;padding:8px 16px;font-size:13px;font-weight:600;border-radius:8px 8px 0 0;margin:-16px -16px 0 -16px;">' +
      '⚠️ PlantUML 渲染失败</div>' +
      '<div style="padding:12px 0 0 0;font-size:13px;color:' + (isDark ? '#e1e4e8' : '#24292f') + ';">' +
      '<div style="margin-bottom:12px;word-break:break-word;">' +
      '<strong>错误原因：</strong><span style="color:#d73a49;">所有 PlantUML 服务器均不可达</span></div>' +
      '<details style="cursor:pointer;">' +
      '<summary style="color:' + (isDark ? '#8b949e' : '#586069') + ';margin-bottom:8px;user-select:none;">查看原始代码</summary>' +
      '<pre style="background:' + (isDark ? '#0d1117' : '#f6f8fa') + ';padding:12px;border-radius:6px;overflow:auto;max-height:300px;margin:0;">' +
      '<code>' + escapedCode + '</code></pre></details></div>';

    if (typeof hljs !== 'undefined') {
      var codeEl = wrapper.querySelector('code');
      if (codeEl) { try { hljs.highlightElement(codeEl); } catch (e) {} }
    }
  }

  AINoteRenderers.register({
    id: 'plantuml',
    name: 'PlantUML',
    codeBlockLanguages: ['plantuml', 'uml'],
    dependencies: [
      'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js'
    ],

    detect: function(container) {
      return container.querySelectorAll('code.language-plantuml, code.language-uml').length > 0;
    },

    render: async function(container, ctx) {
      var blocks = container.querySelectorAll('code.language-plantuml, code.language-uml');
      if (blocks.length === 0) return;

      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var pre = block.closest('pre');
        if (!pre) continue;

        var code = block.textContent;
        var encoded;
        try {
          encoded = plantUmlEncode(code);
        } catch (e) {
          console.warn('AINote PlantUML 编码失败:', e);
          ctx.showError(pre, 'PlantUML', '编码失败: ' + e.message);
          continue;
        }

        var serverList = ctx.getPlantUmlServerList();
        var imgUrls = [];
        for (var s = 0; s < serverList.length; s++) {
          imgUrls.push(serverList[s] + '/svg/' + encoded);
        }

        var firstUrl = imgUrls[0] || ('https://www.plantuml.com/plantuml/svg/' + encoded);
        if (firstUrl.length > 8000) {
          ctx.showError(pre, 'PlantUML', '图表过大（URL ' + firstUrl.length + ' 字符），请拆分后重试');
          continue;
        }

        await loadPlantUmlWithFallback(pre, code, imgUrls, ctx);
      }
    }
  });

})();
