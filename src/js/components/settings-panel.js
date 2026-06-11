/**
 * 设置面板
 */
import settings from '../settings.js';

let panelEl = null;
let isOpen = false;

export function initSettingsPanel() {
  if (panelEl) return;
  createPanel();
}

export function toggleSettingsPanel() {
  if (!panelEl) createPanel();
  isOpen = !isOpen;
  panelEl.style.display = isOpen ? 'block' : 'none';
}

function createPanel() {
  panelEl = document.createElement('div');
  panelEl.id = 'ainote-settings-panel';
  panelEl.style.cssText = `
    display:none;
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:var(--bg-color,#fff);color:var(--text-color,#24292f);
    border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);
    padding:24px;width:360px;max-height:80vh;overflow-y:auto;
    z-index:10000;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  `;

  panelEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h3 style="margin:0;font-size:18px;">⚙️ 设置</h3>
      <button class="ainote-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-color,#666);">&times;</button>
    </div>

    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;margin-bottom:4px;">主题</label>
      <select id="ainote-setting-theme" style="width:100%;padding:8px;border-radius:6px;border:1px solid #d0d7de;">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="github">GitHub</option>
        <option value="vuepress">VuePress</option>
        <option value="gitbook">GitBook</option>
      </select>
    </div>

    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;margin-bottom:4px;">字体大小</label>
      <input type="range" id="ainote-setting-fontsize" min="12" max="24" value="16"
        style="width:100%;" />
      <span id="ainote-setting-fontsize-val" style="font-size:12px;color:#666;">16px</span>
    </div>

    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;margin-bottom:4px;">PlantUML 服务器</label>
      <select id="ainote-setting-plantuml" style="width:100%;padding:8px;border-radius:6px;border:1px solid #d0d7de;">
        <option value="auto">自动 (官方)</option>
        <option value="official">官方</option>
        <option value="custom">自定义</option>
      </select>
    </div>

    <div id="ainote-plantuml-custom-group" style="display:none;margin-bottom:16px;">
      <label style="display:block;font-size:13px;margin-bottom:4px;">自定义服务器地址</label>
      <input type="text" id="ainote-setting-plantuml-custom" placeholder="https://your-server.com/plantuml"
        style="width:100%;padding:8px;border-radius:6px;border:1px solid #d0d7de;" />
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="ainote-settings-reset" style="padding:8px 16px;border:1px solid #d0d7de;border-radius:6px;background:transparent;cursor:pointer;">恢复默认</button>
      <button id="ainote-settings-close" style="padding:8px 16px;border:none;border-radius:6px;background:#1a73e8;color:#fff;cursor:pointer;">关闭</button>
    </div>
  `;

  document.body.appendChild(panelEl);

  // 绑定事件
  const themeSel = document.getElementById('ainote-setting-theme');
  const fontSizeRange = document.getElementById('ainote-setting-fontsize');
  const fontSizeVal = document.getElementById('ainote-setting-fontsize-val');
  const plantumlSel = document.getElementById('ainote-setting-plantuml');
  const plantumlCustomGroup = document.getElementById('ainote-plantuml-custom-group');
  const plantumlCustomInput = document.getElementById('ainote-setting-plantuml-custom');

  // 加载当前值
  themeSel.value = settings.get('theme');
  fontSizeRange.value = settings.get('fontSize');
  fontSizeVal.textContent = settings.get('fontSize') + 'px';
  plantumlSel.value = settings.get('plantUmlServer');
  plantumlCustomInput.value = settings.get('plantUmlCustomServer');
  plantumlCustomGroup.style.display = plantumlSel.value === 'custom' ? 'block' : 'none';

  // 变更监听
  themeSel.addEventListener('change', () => {
    settings.set('theme', themeSel.value);
    applyTheme(themeSel.value);
  });

  fontSizeRange.addEventListener('input', () => {
    fontSizeVal.textContent = fontSizeRange.value + 'px';
    settings.set('fontSize', parseInt(fontSizeRange.value));
  });

  plantumlSel.addEventListener('change', () => {
    settings.set('plantUmlServer', plantumlSel.value);
    plantumlCustomGroup.style.display = plantumlSel.value === 'custom' ? 'block' : 'none';
  });

  plantumlCustomInput.addEventListener('input', () => {
    settings.set('plantUmlCustomServer', plantumlCustomInput.value);
  });

  document.getElementById('ainote-settings-reset').addEventListener('click', () => {
    settings.reset();
    themeSel.value = settings.get('theme');
    fontSizeRange.value = settings.get('fontSize');
    fontSizeVal.textContent = settings.get('fontSize') + 'px';
    plantumlSel.value = settings.get('plantUmlServer');
    plantumlCustomInput.value = settings.get('plantUmlCustomServer');
    plantumlCustomGroup.style.display = plantumlSel.value === 'custom' ? 'block' : 'none';
    applyTheme(settings.get('theme'));
  });

  document.getElementById('ainote-settings-close').addEventListener('click', toggleSettingsPanel);
  panelEl.querySelector('.ainote-close-btn').addEventListener('click', toggleSettingsPanel);

  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (isOpen && !panelEl.contains(e.target) && !e.target.closest('#ainote-btn-settings')) {
      toggleSettingsPanel();
    }
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
