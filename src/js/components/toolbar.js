/**
 * 工具栏管理 - 动态创建操作按钮
 */
import { exportToPDF } from './pdf-export.js';
import { toggleEditorMode } from './editor-mode.js';

let initialized = false;

export function initToolbar(callbacks = {}) {
  if (initialized) return;
  initialized = true;

  const container = document.getElementById('ainote-toolbar-actions');
  if (!container) return;

  function btn(text, title, onClick, id) {
    const b = document.createElement('button');
    b.textContent = text;
    b.title = title;
    b.className = 'ainote-toolbar-btn';
    if (id) b.id = id;
    b.addEventListener('click', onClick);
    return b;
  }

  container.appendChild(btn('📝 渲染', '渲染当前文件 (Ctrl+Shift+R)', () => callbacks.onRender?.()));
  container.appendChild(btn('✏️ 编辑器', '切换编辑器模式 (Ctrl+Shift+E)', () => toggleEditorMode(callbacks)));
  container.appendChild(btn('📄 导出PDF', '导出为 PDF (Ctrl+Shift+D)', () => exportToPDF()));
  container.appendChild(btn('⚙️ 设置', '打开设置面板', () => callbacks.onSettings?.(), 'ainote-btn-settings'));

  // 快捷键
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      callbacks.onRender?.();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      toggleEditorMode(callbacks);
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      exportToPDF();
    }
  });
}
