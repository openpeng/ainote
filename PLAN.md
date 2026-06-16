# Port Chrome Extension Features to Vite Web App

## Overview
Port 14 renderers, 5 standalone format viewers, settings panel, editor mode, PDF export, and enhanced theming from `public/` (Chrome extension) into `src/` (Vite SPA). Adopt extension's registry+pipe pattern adapted for ESM. Replace CDN deps with npm packages.

## Architecture Decision
Keep Shiki for code highlighting (already in web app). Portal renderers from IIFE/global to ESM import/export. Each renderer gets `{ id, name, detect, render }` interface. `renderer-registry.js` and `render-pipeline.js` become ESM classes (no CDN loading needed).

## npm Dependencies to Add
```json
"pako": "^2.1.0",
"@viz-js/viz": "^3.12.0",
"wavedrom": "^3.2.0",
"nomnoml": "^1.5.3",
"vega": "^5.25.0",
"vega-lite": "^5.16.3",
"vega-embed": "^6.24.1",
"leaflet": "^1.9.4",
"asciidoctor": "^3.0.4"
```
Remove `markdown-it-plantuml` (replaced by custom dynamic renderer).

## File Changes

### MODIFIED Files
1. `package.json` - add/remove deps
2. `index.html` - enhanced toolbar, settings panel, editor wrapper
3. `src/css/style.css` - add themes (github/vuepress/gitbook), chart containers, editor layout, print styles
4. `src/js/parser.js` - generic diagram fence plugin (outputs `code.language-xxx` for all diagram types), remove plantuml import, expose Shiki as separate renderer
5. `src/js/main.js` - refactored from 317 lines to ~120 line orchestrator using pipeline

### NEW Files (20)
1. `src/js/settings.js` - localStorage-backed settings singleton
2. `src/js/renderers/renderer-registry.js` - ESM registry class
3. `src/js/renderers/render-pipeline.js` - sequential renderer execution
4. `src/js/renderers/renderer-mermaid.js` - extracted from main.js
5. `src/js/renderers/renderer-plantuml.js` - dynamic multi-server (pako npm)
6. `src/js/renderers/renderer-graphviz.js` - viz.js via @viz-js/viz
7. `src/js/renderers/renderer-d2.js` - D2 API (no local dep)
8. `src/js/renderers/renderer-wavedrom.js` - WaveDrom npm
9. `src/js/renderers/renderer-nomnoml.js` - Nomnoml npm
10. `src/js/renderers/renderer-vega.js` - Vega npm
11. `src/js/renderers/renderer-code.js` - Shiki highlighting extracted from parser
12. `src/js/renderers/renderer-ipynb.js` - standalone IPYNB
13. `src/js/renderers/renderer-csv.js` - standalone CSV/TSV
14. `src/js/renderers/renderer-geojson.js` - standalone GeoJSON (Leaflet)
15. `src/js/renderers/renderer-adoc.js` - standalone AsciiDoc
16. `src/js/renderers/renderer-json.js` - standalone JSON viewer
17. `src/js/components/settings-panel.js` - settings UI
18. `src/js/components/editor-mode.js` - split-pane editor
19. `src/js/components/pdf-export.js` - window.print()
20. `src/js/components/toolbar.js` - toolbar management

### UNCHANGED Files
- `vite.config.js`
- All `public/**` files (extension stays as-is)

## Key Design Decisions

### Renderer Interface
```javascript
registry.register({
  id: 'name', name: 'Display', codeBlockLanguages: ['lang'],
  detect: (container) => container.querySelectorAll('code.language-lang').length > 0,
  render: async (container, ctx) => { /* ... */ }
});
registry.registerStandalone({
  id: 'name', name: 'Display', filePattern: '\\.ext$',
  renderStandalone: async (rawContent, ctx) => { /* ... */ }
});
```

### Parser changes (parser.js)
Replace mermaidPlugin with generic diagramFencePlugin that wraps ALL diagram types in `code.language-xxx` (matching extension detect pattern). List: mermaid, plantuml, uml, dot, graphviz, d2, wave, wavedrom, nomnoml, vega, vega-lite.

### Standalone renderers render into `#markdown-body` (not document.body).

### No dependency loading needed - npm/ESM handles imports. Only exceptions: D2 (API fetch) and PlantUML (server fetch).

## CDN-to-npm Mapping
| CDN | npm | Notes |
|-----|-----|-------|
| pako CDN | pako npm | PlantUML encode |
| viz.js CDN | @viz-js/viz | Check API: Viz.instance() |
| WaveDrom CDN | wavedrom | WaveDrom.renderWaveForm() |
| Nomnoml CDN | nomnoml | nomnoml.renderSvg() |
| Vega CDN | vega/vega-lite/vega-embed | vegaEmbed() |
| Leaflet CDN | leaflet | +CSS import |
| Asciidoctor CDN | asciidoctor | Asciidoctor() |
| D2 API | None | Keep fetch |
| PlantUML | None | Keep fetch |
| highlight.js | Shiki (already used) | Keep Shiki |

## Implementation Order
1. Phase 1: deps + settings.js + registry/pipeline + parser.js update
2. Phase 2: Simple diagram renderers (mermaid, d2, nomnoml) -> complex (plantuml, graphviz, vega, wavedrom)
3. Phase 3: Standalone renderers (json, csv -> ipynb, geojson, adoc)
4. Phase 4: UI (toolbar, settings, editor, PDF)
5. Phase 5: main.js refactor, integration test all formats+themes
