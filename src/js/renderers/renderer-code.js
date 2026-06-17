/**
 * Shiki 代码高亮渲染器
 * 对非图表语言的代码块应用 Shiki 语法高亮
 */
import registry from './renderer-registry.js';

// 图表语言（不需要代码高亮）
const DIAGRAM_LANGS = [
  'mermaid', 'plantuml', 'uml', 'dot', 'graphviz',
  'd2', 'wave', 'wavedrom', 'nomnoml', 'vega',
  'vega-lite', 'math', 'katex', 'tex',
];

registry.register({
  id: 'code',
  name: 'Shiki 代码高亮',

  detect(container) {
    // 检测是否有非图表语言的代码块需要高亮
    const preBlocks = container.querySelectorAll('pre');
    for (const pre of preBlocks) {
      const code = pre.querySelector('code');
      if (!code) continue;
      const cls = code.className || '';
      const langMatch = cls.match(/language-(\S+)/);
      if (!langMatch) continue;
      const lang = langMatch[1].toLowerCase();
      if (!DIAGRAM_LANGS.includes(lang) && !pre.classList.contains('shiki') && !pre.querySelector('.shiki')) {
        return true;
      }
    }
    return false;
  },

  async render(container, ctx) {
    const highlighter = ctx.shikiHighlighter;
    if (!highlighter) return;

    const preBlocks = container.querySelectorAll('pre');
    const loadedLangs = highlighter.getLoadedLanguages();
    // 映射 mdTheme → Shiki 主题
    const SHIKI_THEME_MAP = {
      dracula: 'dracula',
      nord: 'nord',
      gruvbox: 'gruvbox-light',
      catppuccin: 'catppuccin-latte',
      tokyonight: 'tokyo-night',
      dark: 'github-dark',
    };
    const shikiTheme = SHIKI_THEME_MAP[ctx.settings.mdTheme] || 'github-light';

    for (const pre of preBlocks) {
      // 跳过已高亮或图表代码块
      if (pre.classList.contains('shiki') || pre.querySelector('.shiki') || pre.classList.contains('ainote-render-error')) continue;

      const code = pre.querySelector('code');
      if (!code) continue;

      const cls = code.className || '';
      const langMatch = cls.match(/language-(\S+)/);
      if (!langMatch) continue;

      const lang = langMatch[1].toLowerCase();
      if (DIAGRAM_LANGS.includes(lang)) continue;

      if (loadedLangs.includes(lang)) {
        try {
          const highlighted = highlighter.codeToHtml(code.textContent, { lang, theme: shikiTheme });
          const wrapper = document.createElement('div');
          wrapper.className = 'code-block';
          wrapper.innerHTML = highlighted;
          pre.parentNode.replaceChild(wrapper, pre);
        } catch (e) {
          // fallback to default
        }
      }
    }
  },
});
