/**
 * parser.js - Markdown 解析核心模块
 * 集成 markdown-it 及所有插件
 */
import markdownit from 'markdown-it';
import abbr from 'markdown-it-abbr';
import deflist from 'markdown-it-deflist';
import footnote from 'markdown-it-footnote';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import { full as emoji } from 'markdown-it-emoji';
import taskLists from 'markdown-it-task-lists';
import katex from 'markdown-it-katex';

// 图表语言列表（不进行代码高亮，由渲染器处理）
const DIAGRAM_LANGS = [
  'mermaid', 'plantuml', 'uml', 'dot', 'graphviz',
  'd2', 'wave', 'wavedrom', 'nomnoml', 'vega',
  'vega-lite', 'math', 'katex', 'tex',
];

// 通用图表 fence 插件：保留代码块供渲染器检测
function diagramFencePlugin(md) {
  const defaultFence = md.renderer.rules.fence || ((tokens, idx) => {
    const token = tokens[idx];
    const lang = token.info.trim();
    const code = token.content;
    if (lang) {
      return `<pre><code class="language-${md.utils.escapeHtml(lang)}">${md.utils.escapeHtml(code)}</code></pre>\n`;
    }
    return `<pre><code>${md.utils.escapeHtml(code)}</code></pre>\n`;
  });

  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const lang = token.info.trim().toLowerCase();

    // 图表语言：输出带 language-xxx 类的代码块，供渲染器检测
    if (DIAGRAM_LANGS.includes(lang)) {
      const code = token.content;
      return `<pre><code class="language-${md.utils.escapeHtml(lang)}">${md.utils.escapeHtml(code)}</code></pre>\n`;
    }

    return defaultFence(tokens, idx, options, env, slf);
  };
}

// Shiki 代码高亮插件
function shikiPlugin(md, highlighter) {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const lang = token.info.trim().toLowerCase();
    const code = token.content;

    // 跳过图表语言（由渲染器处理）
    if (DIAGRAM_LANGS.includes(lang)) {
      return defaultFence(tokens, idx, options, env, slf);
    }

    const loadedLangs = highlighter.getLoadedLanguages();
    if (highlighter && loadedLangs.includes(lang)) {
      try {
        const highlighted = highlighter.codeToHtml(code, { lang, theme: 'github-light' });
        return `<div class="code-block">${highlighted}</div>`;
      } catch (e) {
        // fallback to default
      }
    }
    return defaultFence(tokens, idx, options, env, slf);
  };
}

/**
 * 创建 markdown-it 实例并加载所有插件
 * @param {object} shikiHighlighter - 可选的 Shiki highlighter 实例
 */
export function createParser(shikiHighlighter = null) {
  const md = markdownit({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
  });

  md.use(abbr);
  md.use(deflist);
  md.use(footnote);
  md.use(sub);
  md.use(sup);
  md.use(emoji);
  md.use(taskLists, { enabled: true });
  md.use(katex, {
    throwOnError: false,
    strict: false,
  });
  md.use(diagramFencePlugin);

  if (shikiHighlighter) {
    md.use(shikiPlugin, shikiHighlighter);
  }

  return md;
}

/**
 * 渲染 Markdown 文本为 HTML
 */
export function renderMarkdown(md, text) {
  return md.render(text);
}

export { DIAGRAM_LANGS };
export default createParser;
