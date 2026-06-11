// AINote Bridge - 运行在页面 MAIN world
// 将库全局变量暴露到 DOM 原型链上，绕过 Chrome isolated world 隔离
// Content script (ISOLATED world) 通过 document.createElement('div').__ainote_xxx 读取
(function() {
  var p = HTMLDivElement.prototype;
  if (typeof markdownit !== 'undefined') p.__ainote_markdownit = markdownit;
  if (typeof mermaid !== 'undefined') p.__ainote_mermaid = mermaid;
  if (typeof katex !== 'undefined') p.__ainote_katex = katex;
  if (typeof hljs !== 'undefined') p.__ainote_hljs = hljs;
  if (typeof pako !== 'undefined') p.__ainote_pako = pako;
  if (typeof Viz !== 'undefined') p.__ainote_Viz = Viz;
})();
