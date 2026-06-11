// ========== AINote 渲染管道 ==========
// 负责编排所有已注册的渲染器：
//   1. 收集所有渲染器依赖 → 并行加载（使用 content.js 的 3 级降级策略）
//   2. 顺序执行每个渲染器（避免 DOM 并发修改冲突）
//   3. 每个渲染器有独立 try-catch，一个失败不影响其他
var AINotePipeline = {
  /**
   * 执行渲染管道
   * @param {Element} container - 渲染目标容器
   * @param {Object} ctx - 渲染上下文 { settings, escapeHtml, loadScript, loadCSS, getLocalUrl, getPlantUmlServerList, fixSvgDisplay }
   * @returns {Promise<{success: string[], failed: string[]}>}
   */
  run: async function(container, ctx) {
    var applicable = AINoteRenderers.getApplicable(container);
    var success = [];
    var failed = [];

    if (applicable.length === 0) return { success: success, failed: failed };

    // 1. 收集并加载所有依赖（去重 + 并行）
    var allDeps = new Set();
    var allCssDeps = new Set();
    for (var i = 0; i < applicable.length; i++) {
      var deps = applicable[i].dependencies || [];
      var cssDeps = applicable[i].cssDependencies || [];
      for (var j = 0; j < deps.length; j++) allDeps.add(deps[j]);
      for (var k = 0; k < cssDeps.length; k++) allCssDeps.add(cssDeps[k]);
    }

    // 并行加载 CSS
    var cssArr = Array.from(allCssDeps);
    await Promise.all(cssArr.map(function(href) {
      return ctx.loadCSS(href).catch(function(e) {
        console.warn('[AINote] CSS 加载失败: ' + href + ' ' + e);
      });
    }));

    // 并行加载 JS 依赖（每个依赖走 3 级降级路径）
    var jsArr = Array.from(allDeps);
    await Promise.all(jsArr.map(function(src) {
      return ctx.loadScript(src).catch(function(e) {
        console.warn('[AINote] JS 加载失败: ' + src + ' ' + e);
      });
    }));

    // 2. 顺序执行渲染器（避免 DOM 并发修改）
    for (var i = 0; i < applicable.length; i++) {
      var renderer = applicable[i];
      try {
        await renderer.render(container, ctx);
        success.push(renderer.id);
      } catch (err) {
        console.error('[AINote] 渲染器 [' + renderer.id + '] 失败:', err);
        failed.push(renderer.id);
        // 不向上抛出，让其他渲染器继续
      }
    }

    // 3. 统一修复 SVG 显示
    if (ctx.fixSvgDisplay) {
      ctx.fixSvgDisplay(container);
    }

    return { success: success, failed: failed };
  }
};
