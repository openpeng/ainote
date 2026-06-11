// ========== AINote 渲染器注册表 ==========
// 所有渲染器通过 RendererRegistry.register() 注册
// 添加新格式只需在此数组中追加一项 + 创建对应的 renderer-xxx.js 文件

var AINoteRenderers = (function() {
  'use strict';

  var _renderers = [];

  return {
    /** 注册一个渲染器 */
    register: function(renderer) {
      // 自动补充 CSS 命名空间前缀，避免各渲染器之间的样式冲突
      renderer._ns = 'ainote-r-' + renderer.id + '-';
      _renderers.push(renderer);
    },

    /** 获取所有已注册的渲染器 */
    getAll: function() {
      return _renderers;
    },

    /**
     * 给定容器，返回所有 detect() 返回 true 的渲染器（代码块渲染器）
     * 并去重（同一个 id 只取第一个）
     */
    getApplicable: function(container) {
      var seen = {};
      var result = [];
      for (var i = 0; i < _renderers.length; i++) {
        var r = _renderers[i];
        if (r._standalone) continue;  // 跳过独立文件格式渲染器
        if (seen[r.id]) continue;
        if (typeof r.detect === 'function' && r.detect(container)) {
          seen[r.id] = true;
          result.push(r);
        }
      }
      return result;
    },

    /**
     * 根据 URL 路径查找匹配的独立文件格式渲染器
     * @param {string} path - window.location.pathname
     * @returns {Object|null} 匹配的渲染器，未匹配返回 null
     */
    getForFile: function(path) {
      for (var i = 0; i < _renderers.length; i++) {
        var r = _renderers[i];
        if (r._standalone && r.filePattern && path.match(new RegExp(r.filePattern, 'i'))) {
          return r;
        }
      }
      return null;
    },

    /**
     * 注册独立文件格式渲染器（自动标记 _standalone = true）
     */
    registerStandalone: function(renderer) {
      renderer._standalone = true;
      this.register(renderer);
    }
  };
})();
