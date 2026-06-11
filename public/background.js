// AINote 后台脚本 (Manifest V3 Service Worker)

// 右键菜单 URL 模式
const MD_PATTERNS = ['*://*/*.md', '*://*/*.markdown', '*://*/*blob/*', '*://*/*raw/*'];
const DRAWIO_PATTERNS = ['*://*/*.drawio', '*://*/*.dio', '*://*/*.drawio/*raw*', '*://*/*.dio/*raw*'];
// 新增独立文件格式
const STANDALONE_PATTERNS = [
  '*://*/*.ipynb', '*://*/*.ipynb/*raw*',
  '*://*/*.csv', '*://*/*.csv/*raw*',
  '*://*/*.tsv', '*://*/*.tsv/*raw*',
  '*://*/*.geojson', '*://*/*.geojson/*raw*',
  '*://*/*.topojson', '*://*/*.topojson/*raw*',
  '*://*/*.adoc', '*://*/*.adoc/*raw*',
  '*://*/*.asciidoc', '*://*/*.asciidoc/*raw*',
  '*://*/*.json', '*://*/*.json/*raw*'
];
const ALL_PATTERNS = [...MD_PATTERNS, ...DRAWIO_PATTERNS, ...STANDALONE_PATTERNS];

// 插件安装时初始化默认设置
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AINote 插件已安装');

    // 初始化默认设置
    chrome.storage.sync.set({
      autoRender: true,
      theme: 'light',
      fontSize: 16,
      lineNumbers: true,
      editorMode: false
    }, () => {
      console.log('默认设置已初始化');
    });

    // 创建右键菜单
    createContextMenus();
  } else if (details.reason === 'update') {
    console.log('AINote 插件已更新到 ' + chrome.runtime.getManifest().version);
    createContextMenus();
  }
});

// 创建右键菜单
function createContextMenus() {
  if (!chrome.contextMenus) return;
  // 先移除所有现有菜单
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'ainote-render',
      title: '📝 用 AINote 渲染',
      contexts: ['page'],
      documentUrlPatterns: ALL_PATTERNS
    });

    chrome.contextMenus.create({
      id: 'ainote-reset',
      title: '🔙 恢复原始页面',
      contexts: ['page'],
      documentUrlPatterns: ALL_PATTERNS
    });

    // 分隔线
    chrome.contextMenus.create({
      id: 'ainote-sep',
      type: 'separator',
      contexts: ['page'],
      documentUrlPatterns: ALL_PATTERNS
    });

    // 导出 PDF（仅 MD 文件）
    chrome.contextMenus.create({
      id: 'ainote-export-pdf',
      title: '📄 导出 PDF',
      contexts: ['page'],
      documentUrlPatterns: MD_PATTERNS
    });

    // 切换编辑器模式（仅 MD 文件）
    chrome.contextMenus.create({
      id: 'ainote-toggle-editor',
      title: '✏️ 切换编辑器模式',
      contexts: ['page'],
      documentUrlPatterns: MD_PATTERNS
    });
  });
}

// 监听右键菜单点击
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'ainote-render') {
    chrome.tabs.sendMessage(tab.id, { action: 'render' });
  } else if (info.menuItemId === 'ainote-reset') {
    chrome.tabs.sendMessage(tab.id, { action: 'reset' });
  } else if (info.menuItemId === 'ainote-export-pdf') {
    chrome.tabs.sendMessage(tab.id, { action: 'exportPDF' });
  } else if (info.menuItemId === 'ainote-toggle-editor') {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleEditor' });
  }
});
}

// 监听来自 content script 的消息（如果需要）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'log') {
    console.log('[AINote Content]', message.data);
  }
  if (message.action === 'getTabId') {
    sendResponse({ tabId: sender.tab?.id });
  }
  return false;
});
