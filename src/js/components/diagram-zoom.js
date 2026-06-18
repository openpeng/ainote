/**
 * diagram-zoom.js - 图表缩放/拖拽查看器
 * 点击 Mermaid/PlantUML/Graphviz 等图表后在弹窗中放大查看
 */

let overlay = null;
let stage = null;
let svgEl = null;
let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragTranslateX = 0;
let dragTranslateY = 0;

const MIN_SCALE = 0.3;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;

function createOverlay() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'ainote-zoom-overlay';
  overlay.className = 'ainote-zoom-overlay';
  overlay.innerHTML = `
    <button class="ainote-zoom-close" title="关闭 (Esc)">&times;</button>
    <div class="ainote-zoom-toolbar">
      <button class="ainote-zoom-btn" title="放大" data-action="in">＋</button>
      <span class="ainote-zoom-level">100%</span>
      <button class="ainote-zoom-btn" title="缩小" data-action="out">－</button>
      <button class="ainote-zoom-btn" title="重置" data-action="reset">↺</button>
      <button class="ainote-zoom-btn" title="适合窗口" data-action="fit">⊡</button>
    </div>
    <div class="ainote-zoom-stage"></div>
  `;

  stage = overlay.querySelector('.ainote-zoom-stage');
  const levelEl = overlay.querySelector('.ainote-zoom-level');

  // === 关闭 ===
  function close() { removeOverlay(); }

  overlay.querySelector('.ainote-zoom-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // === 工具栏按钮 ===
  overlay.querySelectorAll('.ainote-zoom-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switch (btn.dataset.action) {
        case 'in':  applyZoom(scale + ZOOM_STEP); break;
        case 'out': applyZoom(scale - ZOOM_STEP); break;
        case 'reset': resetView(); break;
        case 'fit': fitToWindow(); break;
      }
    });
  });

  // === 滚轮缩放 ===
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    applyZoom(scale + delta);
  }, { passive: false });

  // === 拖拽平移 ===
  stage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragTranslateX = translateX;
    dragTranslateY = translateY;
    stage.classList.add('dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    translateX = dragTranslateX + (e.clientX - dragStartX);
    translateY = dragTranslateY + (e.clientY - dragStartY);
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      stage.classList.remove('dragging');
    }
  });

  // === 键盘快捷键 ===
  function onKeyDown(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === '+' || e.key === '=') { applyZoom(scale + ZOOM_STEP); return; }
    if (e.key === '-') { applyZoom(scale - ZOOM_STEP); return; }
    if (e.key === '0') { resetView(); return; }
  }

  function applyZoom(newScale) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    if (levelEl) {
      levelEl.textContent = Math.round(scale * 100) + '%';
    }
    updateTransform();
  }

  function updateTransform() {
    if (!svgEl) return;
    svgEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  function resetView() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    if (levelEl) levelEl.textContent = '100%';
    updateTransform();
  }

  function fitToWindow() {
    if (!svgEl || !stage) return;
    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;

    // 获取 SVG 的实际尺寸
    let svgW = svgEl.getAttribute('width');
    let svgH = svgEl.getAttribute('height');

    if (svgW && svgH) {
      svgW = parseFloat(svgW);
      svgH = parseFloat(svgH);
    } else {
      const bbox = svgEl.getBBox ? svgEl.getBBox() : null;
      if (bbox) { svgW = bbox.width; svgH = bbox.height; }
      else { svgW = 800; svgH = 600; }
    }

    const padding = 60;
    const scaleX = (stageW - padding * 2) / svgW;
    const scaleY = (stageH - padding * 2) / svgH;
    scale = Math.min(scaleX, scaleY, 2);
    translateX = 0;
    translateY = 0;
    if (levelEl) levelEl.textContent = Math.round(scale * 100) + '%';
    updateTransform();
  }

  document.addEventListener('keydown', onKeyDown);
  overlay._onKeyDown = onKeyDown;

  document.body.appendChild(overlay);
}

function removeOverlay() {
  if (!overlay) return;
  if (overlay._onKeyDown) {
    document.removeEventListener('keydown', overlay._onKeyDown);
  }
  isDragging = false;
  svgEl = null;
  scale = 1;
  translateX = 0;
  translateY = 0;
  overlay.remove();
  overlay = null;
  stage = null;
}

function showDiagram(svgContent) {
  createOverlay();
  if (!stage) return;

  // 清除旧内容
  stage.innerHTML = svgContent;
  svgEl = stage.querySelector('svg');
  if (svgEl) {
    svgEl.style.transformOrigin = 'center center';
    svgEl.style.transition = 'transform 0.1s ease-out';
    // 先适合窗口
    requestAnimationFrame(() => fitToWindow());
  }
}

/**
 * 为容器内的图表元素绑定点击事件
 * 匹配 .ainote-mermaid, .ainote-plantuml, .ainote-graphviz, .ainote-d2, .ainote-wavedrom, .ainote-nomnoml, .ainote-vega
 * 以及扩展中的 .mermaid-chart, .plantuml-chart 等
 */
export function initDiagramZoom(container) {
  const diagramSelectors = [
    '.ainote-mermaid', '.ainote-plantuml', '.ainote-graphviz', '.ainote-d2',
    '.ainote-wavedrom', '.ainote-nomnoml', '.ainote-vega',
    '.mermaid-chart', '.plantuml-chart', '.graphviz-chart', '.d2-chart',
    '.mermaid-svg',
  ];

  diagramSelectors.forEach(selector => {
    const diagrams = container.querySelectorAll(selector);
    diagrams.forEach(diagram => {
      // 避免重复绑定
      if (diagram.dataset.zoomBound === '1') return;
      diagram.dataset.zoomBound = '1';
      diagram.style.cursor = 'zoom-in';
      diagram.title = '点击放大查看';

      diagram.addEventListener('click', (e) => {
        e.stopPropagation();
        // 获取内部 SVG
        const svg = diagram.querySelector('svg');
        const img = diagram.querySelector('img');
        if (svg) {
          showDiagram(svg.outerHTML);
        } else if (img) {
          showDiagram(`<img src="${img.src}" style="max-width:100%;height:auto;" />`);
        }
      });
    });
  });
}
