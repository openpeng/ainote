/**
 * 编辑器模式（分屏实时预览）
 */
import settings from '../settings.js';
import createParser, { renderMarkdown } from '../parser.js';
import pipeline from '../renderers/render-pipeline.js';

let isEditorMode = false;
let editorWrapper = null;

export function toggleEditorMode(callbacks = {}) {
  if (!isEditorMode) {
    enterEditorMode(callbacks);
  } else {
    exitEditorMode(callbacks);
  }
  isEditorMode = !isEditorMode;
}

function enterEditorMode(callbacks) {
  const markdownBody = document.getElementById('markdown-body');
  if (!markdownBody || !markdownBody.dataset.rawMarkdown) {
    console.warn('[AINote] 无 Markdown 内容，无法进入编辑器模式');
    return;
  }

  const rawText = markdownBody.dataset.rawMarkdown;

  editorWrapper = document.createElement('div');
  editorWrapper.id = 'ainote-editor-wrapper';
  editorWrapper.style.cssText = 'display:flex;gap:20px;height:calc(100vh - 60px);';

  // 编辑面板
  const editorPanel = document.createElement('div');
  editorPanel.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;';

  const textarea = document.createElement('textarea');
  textarea.id = 'ainote-editor-textarea';
  textarea.value = rawText;
  textarea.style.cssText = `
    flex:1;width:100%;padding:16px;
    border:1px solid #d0d7de;border-radius:6px;
    font-family:Consolas,monospace;font-size:14px;
    line-height:1.5;resize:none;
  `;
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    textarea.style.background = '#161b22';
    textarea.style.color = '#c9d1d9';
    textarea.style.borderColor = '#30363d';
  }

  let previewTimer = null;
  textarea.addEventListener('input', () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      updatePreview(textarea.value, callbacks);
    }, 500);
  });

  editorPanel.appendChild(textarea);

  // 预览面板
  const previewPanel = document.createElement('div');
  previewPanel.id = 'ainote-preview-panel';
  previewPanel.style.cssText = 'flex:1;min-width:0;overflow-y:auto;padding:16px;';

  editorWrapper.appendChild(editorPanel);
  editorWrapper.appendChild(previewPanel);

  markdownBody.innerHTML = '';
  markdownBody.appendChild(editorWrapper);

  // 初始渲染
  updatePreview(rawText, callbacks);
}

function exitEditorMode(callbacks) {
  const markdownBody = document.getElementById('markdown-body');
  if (editorWrapper) {
    markdownBody.innerHTML = '';
    editorWrapper = null;
  }

  // 重新渲染
  if (callbacks.onRender) {
    callbacks.onRender();
  }
}

async function updatePreview(text, callbacks) {
  const previewPanel = document.getElementById('ainote-preview-panel');
  if (!previewPanel) return;

  // 更新原始 Markdown
  const markdownBody = document.getElementById('markdown-body');
  if (markdownBody) markdownBody.dataset.rawMarkdown = text;

  try {
    const parser = createParser(callbacks.shikiHighlighter);
    const html = renderMarkdown(parser, text);
    previewPanel.innerHTML = html;

    // 运行渲染管道
    const ctx = callbacks.createContext ? callbacks.createContext() : {};
    await pipeline.run(previewPanel, ctx);

  } catch (e) {
    console.error('[AINote] 预览渲染失败:', e);
  }
}

export { isEditorMode };
