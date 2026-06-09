# AINote 架构图渲染测试

本文件用于测试 AINote 浏览器插件对各种 AI 生成架构图格式的支持。

---

## 1. Mermaid 流程图

```mermaid
graph TD
    A[用户请求] --> B(AINote 插件)
    B --> C{是否 .md 文件?}
    C -->|是| D[获取 Markdown 内容]
    C -->|否| E[不处理]
    D --> F[Markdown-it 解析]
    F --> G[渲染 Mermaid 图表]
    F --> H[渲染 KaTeX 公式]
    F --> I[代码高亮]
    G --> J[显示渲染结果]
    H --> J
    I --> J
```

## 2. Mermaid 时序图

```mermaid
sequenceDiagram
    participant U as 用户
    participant B as 浏览器
    participant P as AINote 插件
    participant S as CDN 服务器

    U->>B: 访问 .md 文件
    B->>P: 触发 content script
    P->>S: 加载 markdown-it/mermaid/katex
    S-->>P: 返回 JS/CSS
    P->>P: 渲染 Markdown
    P-->>B: 显示渲染结果
    U->>P: 点击浮动按钮
    P-->>B: 恢复原始页面
```

## 3. Mermaid 甘特图

```mermaid
gantt
    title AINote 插件开发计划
    dateFormat  YYYY-MM-DD
    section 基础功能
    项目初始化           :a1, 2026-06-01, 1d
    插件结构设计         :a2, after a1, 2d
    Markdown 解析引擎   :a3, after a2, 2d
    section 图表支持
    Mermaid 集成        :b1, after a3, 2d
    PlantUML 集成       :b2, after b1, 2d
    Graphviz 集成       :b3, after b2, 2d
    D2 集成            :b4, after b3, 1d
    section 优化
    主题切换功能         :c1, after b4, 1d
    编辑器模式           :c2, after c1, 2d
    导出 PDF            :c3, after c2, 1d
```

## 4. Mermaid 类图

```mermaid
classDiagram
    class MarkdownRenderer {
        +render(mdText: string): string
        +highlightCode(): void
        +renderMath(): void
    }

    class MermaidRenderer {
        +renderMermaidBlocks(container): Promise<void>
    }

    class PlantUMLRenderer {
        +renderPlantUMLBlocks(container): Promise<void>
        -plantUmlEncode(text): string
    }

    class GraphvizRenderer {
        +renderGraphvizBlocks(container): Promise<void>
    }

    MarkdownRenderer <|-- MermaidRenderer
    MarkdownRenderer <|-- PlantUMLRenderer
    MarkdownRenderer <|-- GraphvizRenderer
```

## 5. PlantUML 时序图

```plantuml
@startuml
title AINote 插件工作流程

actor 用户 as U
participant "浏览器" as B
participant "AINote 插件" as P
participant "CDN" as S

U -> B: 访问 .md 文件
B -> P: 触发 content script
P -> S: 加载依赖
S --> P: 返回 JS/CSS
P -> P: 解析 Markdown
P -> P: 渲染图表和公式
P --> B: 显示结果

@enduml
```

## 6. PlantUML 类图

```plantuml
@startuml
class MarkdownRenderer {
  +render(mdText: String): String
  +highlightCode(): void
}

class MermaidRenderer {
  +renderMermaidBlocks(container): void
}

class PlantUMLRenderer {
  +renderPlantUMLBlocks(container): void
  -plantUmlEncode(text: String): String
}

MarkdownRenderer <|-- MermaidRenderer
MarkdownRenderer <|-- PlantUMLRenderer
@enduml
```

## 7. Graphviz DOT 图（系统架构）

```dot
digraph system_architecture {
    rankdir=TB;
    node [shape=box, style=filled, fillcolor=lightblue];

    client [label="浏览器客户端", fillcolor=lightgreen];
    extension [label="AINote\n浏览器插件", fillcolor=lightyellow];
    cdn [label="CDN\n(markdown-it/mermaid/katex)", fillcolor=lightpink];
    github [label="GitHub\n原始 .md 文件", fillcolor=lightgrey];

    client -> extension [label="访问 .md 文件"];
    extension -> cdn [label="加载依赖"];
    extension -> github [label="获取原始内容"];
    extension -> extension [label="解析并渲染"];
    client <- extension [label="显示渲染结果"];
}
```

## 8. Graphviz DOT 图（数据流）

```dot
digraph data_flow {
    rankdir=LR;
    node [shape=ellipse, style=filled, fillcolor=lightblue];

    mdfile [label="Markdown 文件", fillcolor=lightgreen];
    parser [label="Markdown-it\n解析器", fillcolor=lightyellow];
    html [label="HTML 输出", fillcolor=lightpink];
    mermaid [label="Mermaid\n图表", fillcolor=lightgrey];
    katex [label="KaTeX\n公式", fillcolor=lightcoral];
    highlight [label="Highlight.js\n代码高亮", fillcolor=lightcyan];

    mdfile -> parser;
    parser -> html;
    parser -> mermaid;
    parser -> katex;
    parser -> highlight;
}
```

## 9. D2 图（插件架构）

```d2
title: AINote 浏览器插件架构

chrome_extension: {
  label: "Chrome 扩展"
  shape: rectangle

  manifest: {
    label: "manifest.json\n(Manifest V3)"
    shape: rectangle
  }

  popup: {
    label: "popup.html/js\n(设置面板)"
    shape: rectangle
  }

  background: {
    label: "background.js\n(后台脚本)"
    shape: rectangle
  }

  content: {
    label: "content.js\n(内容脚本)"
    shape: rectangle

    parsers: {
      markdown_it: "Markdown-it"
      mermaid: "Mermaid"
      plantuml: "PlantUML"
      graphviz: "Graphviz"
      katex: "KaTeX"
      highlightjs: "Highlight.js"
    }
  }
}

user: {
  label: "用户"
  shape: person
}

user -> popup: "打开设置"
user -> content: "访问 .md 文件"
content -> parsers: "渲染内容"
parsers -> user: "显示结果"
```

## 10. 直接嵌入 SVG

以下是直接嵌入的 SVG 图形（AI 有时会自动生成 SVG 代码）：

<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <rect x="10" y="10" width="380" height="180" fill="#f0f0f0" stroke="#333" stroke-width="2" rx="10"/>
  <circle cx="100" cy="100" r="40" fill="#4caf50" opacity="0.7"/>
  <rect x="200" y="60" width="80" height="80" fill="#2196f3" opacity="0.7"/>
  <polygon points="320,140 280,140 300,60" fill="#ff9800" opacity="0.7"/>
  <text x="200" y="190" text-anchor="middle" font-family="Arial" font-size="14">嵌入式 SVG 测试</text>
</svg>

---

## 11. 测试说明

### 预期效果

| 格式 | 预期渲染结果 |
|------|--------------|
| Mermaid | 显示为交互式 SVG 图表 |
| PlantUML | 显示为来自官方服务器的 SVG 图片 |
| Graphviz DOT | 显示为 SVG 图表（使用 viz.js 在浏览器端渲染） |
| D2 | 显示为来自官方服务器的 SVG 图片（可能受 CORS 限制） |
| 直接嵌入 SVG | 直接显示为 SVG 图形 |

### 测试方法

1. 将本文件上传到 GitHub 仓库（`openpeng/ainote`）
2. 获取 raw 文件链接（`https://raw.githubusercontent.com/...`）
3. 在浏览器中打开该链接
4. AINote 插件应自动渲染本文件
5. 检查各种图表是否正确显示

### 问题排查

- **Mermaid 不显示**：检查浏览器控制台是否有 `mermaid.render()` 错误
- **PlantUML 不显示**：检查网络请求是否成功（`https://www.plantuml.com/...`）
- **Graphviz 不显示**：检查 `viz.js` 是否加载成功
- **D2 不显示**：可能是 CORS 问题，检查网络请求是否被阻止
- **SVG 不显示**：检查 SVG 代码是否完整，是否有语法错误
