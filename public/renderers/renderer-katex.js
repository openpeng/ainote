// ========== KaTeX 数学公式渲染器 ==========
(function() {
  'use strict';

  AINoteRenderers.register({
    id: 'katex',
    name: 'KaTeX',
    codeBlockLanguages: null,
    dependencies: [
      'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js'
    ],
    cssDependencies: [
      'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css'
    ],

    detect: function(container) {
      return container.textContent.indexOf('$') !== -1;
    },

    render: function(container, ctx) {
      if (typeof katex === 'undefined') return;

      // TreeWalker 收集包含 $ 的文本节点
      var walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            var parent = node.parentNode;
            if (parent.classList) {
              if (parent.classList.contains('katex') ||
                  parent.classList.contains('katex-display') ||
                  parent.tagName === 'CODE' ||
                  parent.tagName === 'PRE') {
                return NodeFilter.FILTER_REJECT;
              }
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      var textNodes = [];
      var node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.indexOf('$') !== -1) {
          textNodes.push(node);
        }
      }

      // 逆序遍历，避免替换时影响后续节点
      for (var i = textNodes.length - 1; i >= 0; i--) {
        var textNode = textNodes[i];
        var parent = textNode.parentNode;
        var text = textNode.nodeValue;
        var newHTML = text;

        // 块级公式 $$...$$
        newHTML = newHTML.replace(/\$\$([\s\S]*?)\$\$/g, function(match, formula) {
          try {
            return '<span class="katex-formula">' +
                   katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }) +
                   '</span>';
          } catch (e) {
            return match;
          }
        });

        // 行内公式 $...$
        var inlineRegex = /(^|[^\\])\$([^\$\n]+?)\$/g;
        newHTML = newHTML.replace(inlineRegex, function(match, prefix, formula) {
          try {
            return prefix + '<span class="katex-formula-inline">' +
                   katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false }) +
                   '</span>';
          } catch (e) {
            return match;
          }
        });

        // 恢复 \$ → $
        newHTML = newHTML.replace(/\\\$/g, '$');

        if (newHTML !== text) {
          var temp = document.createElement('span');
          temp.innerHTML = newHTML;
          parent.replaceChild(temp, textNode);
        }
      }
    }
  });

})();
