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
import emoji from 'markdown-it-emoji';
import taskLists from 'markdown-it-task-lists';
import plantuml from 'markdown-it-plantuml';
import katex from 'markdown-it-katex';

// Mermaid 插件：把 ```mermaid 代码块转为 <pre class="mermaid"> 供前端渲染
function mermaidPlugin(md) {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    if (token.info.trim() === 'mermaid') {
      const code = token.content;
      return `<pre class="mermaid">${md.utils.escapeHtml(code)}</pre>`;
    }
    return defaultFence(tokens, idx, options, env, slf);
  };
}

// Shiki 代码高亮插件
function shikiPlugin(md, highlighter) {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const lang = token.info.trim();
    const code = token.content;

    // 跳过 mermaid/plantuml/katex 等非代码块
    if (['mermaid', 'plantuml', 'katex', 'math', 'tex'].includes(lang)) {
      return defaultFence(tokens, idx, options, env, slf);
    }

    if (highlighter && lang && highlighter.getLanguage(lang)) {
      try {
        const highlighted = highlighter.codeToHtml(code, { lang });
        return `<div class="code-block">${highlighted}</div>`;
      } catch (e) {
        // fallback
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
    html: true,        // 允许 HTML 标签
    breaks: true,      // 换行转为 <br>
    linkify: true,     // 自动识别链接
    typographer: true, // 引号替换等排版优化
  });

  // 注册插件
  md.use(abbr);
  md.use(deflist);
  md.use(footnote);
  md.use(sub);
  md.use(sup);
  md.use(emoji);
  md.use(taskLists, { enabled: true });
  md.use(plantuml);
  md.use(katex, {
    throwOnError: false,
    strict: false,
  });
  md.use(mermaidPlugin);

  // Shiki 高亮（如果已加载）
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

export default createParser;
