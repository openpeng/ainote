/**
 * render-pipeline.js - 渲染管道
 * 顺序执行所有适用的渲染器，一个失败不影响其他
 */
import registry from './renderer-registry.js';

class RenderPipeline {
  /**
   * 执行渲染管道
   * @param {Element} container - 渲染目标容器
   * @param {Object} ctx - 渲染上下文
   * @returns {Promise<{success: string[], failed: string[]}>}
   */
  async run(container, ctx) {
    const applicable = registry.getApplicable(container);
    const success = [];
    const failed = [];

    if (applicable.length === 0) return { success, failed };

    for (const renderer of applicable) {
      try {
        await renderer.render(container, ctx);
        success.push(renderer.id);
      } catch (err) {
        console.error(`[AINote] 渲染器 [${renderer.id}] 失败:`, err);
        failed.push(renderer.id);
      }
    }

    return { success, failed };
  }
}

const pipeline = new RenderPipeline();
export default pipeline;
