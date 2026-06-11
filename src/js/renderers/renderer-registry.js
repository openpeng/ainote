/**
 * renderer-registry.js - 渲染器注册表
 * 支持代码块渲染器和独立文件格式渲染器
 */

class RendererRegistry {
  constructor() {
    this._renderers = [];
    this._standaloneRenderers = [];
  }

  /**
   * 注册代码块渲染器
   * @param {Object} meta - { id, name, codeBlockLanguages, detect, render }
   */
  register(meta) {
    if (!meta.id || !meta.name || !meta.detect || !meta.render) {
      console.warn('[AINote] 渲染器注册失败：缺少必要字段', meta);
      return;
    }
    this._renderers.push(meta);
  }

  /**
   * 注册独立文件格式渲染器
   * @param {Object} meta - { id, name, filePattern, renderStandalone }
   */
  registerStandalone(meta) {
    if (!meta.id || !meta.name || !meta.filePattern || !meta.renderStandalone) {
      console.warn('[AINote] 独立渲染器注册失败：缺少必要字段', meta);
      return;
    }
    this._standaloneRenderers.push(meta);
  }

  /**
   * 获取所有可应用于容器的渲染器
   */
  getApplicable(container) {
    return this._renderers.filter(r => {
      try { return r.detect(container); } catch (e) { return false; }
    });
  }

  /**
   * 根据文件路径匹配独立渲染器
   */
  getForFile(pathname) {
    for (const r of this._standaloneRenderers) {
      try {
        const re = new RegExp(r.filePattern, 'i');
        if (re.test(pathname)) return r;
      } catch (e) {}
    }
    return null;
  }

  getAll() {
    return [...this._renderers];
  }

  getStandaloneAll() {
    return [...this._standaloneRenderers];
  }
}

const registry = new RendererRegistry();
export default registry;
