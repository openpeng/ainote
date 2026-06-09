// 默认配置
const DEFAULT_SETTINGS = {
  autoRender: true,
  theme: 'light',
  fontSize: 16,
  lineNumbers: true,
  editorMode: false,
  plantUmlServer: 'auto',
  plantUmlCustomServer: ''
};

// 加载配置
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    document.getElementById('auto-render').checked = settings.autoRender;
    document.getElementById('theme').value = settings.theme;
    document.getElementById('font-size').value = settings.fontSize;
    document.getElementById('font-size-value').textContent = settings.fontSize + 'px';
    document.getElementById('line-numbers').checked = settings.lineNumbers;
    document.getElementById('plantuml-server').value = settings.plantUmlServer;
    document.getElementById('plantuml-custom').value = settings.plantUmlCustomServer || '';
    toggleCustomServer(settings.plantUmlServer);
  });
}

// 根据服务器类型显示/隐藏自定义输入框
function toggleCustomServer(type) {
  const wrap = document.getElementById('plantuml-custom-wrap');
  if (type === 'custom') {
    wrap.style.display = 'block';
  } else {
    wrap.style.display = 'none';
  }
}

// 保存配置
function saveSetting(key, value) {
  const settings = {};
  settings[key] = value;
  chrome.storage.sync.set(settings, () => {
    // 通知 content script 更新设置
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: { [key]: value }
        });
      }
    });
  });
}

// 发送消息给 content script
function sendMessageToContent(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        const statusEl = document.getElementById('status');
        if (chrome.runtime.lastError) {
          statusEl.textContent = '⚠️ 请刷新页面后重试';
          statusEl.style.color = '#d93025';
        } else if (response && response.status) {
          statusEl.textContent = '✅ ' + response.status;
          statusEl.style.color = '#1e8e3e';
        }
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      });
    }
  });
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // 自动渲染开关
  document.getElementById('auto-render').addEventListener('change', (e) => {
    saveSetting('autoRender', e.target.checked);
  });

  // 主题选择
  document.getElementById('theme').addEventListener('change', (e) => {
    saveSetting('theme', e.target.value);
  });

  // 字体大小
  const fontSizeInput = document.getElementById('font-size');
  fontSizeInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    document.getElementById('font-size-value').textContent = val + 'px';
    saveSetting('fontSize', val);
  });
  fontSizeInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    saveSetting('fontSize', val);
  });

  // 行号显示
  document.getElementById('line-numbers').addEventListener('change', (e) => {
    saveSetting('lineNumbers', e.target.checked);
  });

  // PlantUML 服务器选择
  const plantUmlServerSelect = document.getElementById('plantuml-server');
  plantUmlServerSelect.addEventListener('change', (e) => {
    saveSetting('plantUmlServer', e.target.value);
    toggleCustomServer(e.target.value);
  });

  // PlantUML 自定义服务器地址
  document.getElementById('plantuml-custom').addEventListener('change', (e) => {
    saveSetting('plantUmlCustomServer', e.target.value.trim());
  });

  // 手动渲染按钮
  document.getElementById('manual-render').addEventListener('click', () => {
    sendMessageToContent({ action: 'render' });
  });

  // 切换编辑器模式按钮
  document.getElementById('toggle-editor').addEventListener('click', () => {
    sendMessageToContent({ action: 'toggleEditor' });
  });

  // 导出 PDF 按钮
  document.getElementById('export-pdf').addEventListener('click', () => {
    sendMessageToContent({ action: 'exportPDF' });
  });

  // 恢复原始页面按钮
  document.getElementById('reset').addEventListener('click', () => {
    sendMessageToContent({ action: 'reset' });
  });
});
