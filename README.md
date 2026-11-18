# 琢玉 Zhuoyu

> 如切如磋，如琢如磨。  
> 问渠的姊妹平台：问渠回答「前人做过吗」，琢玉回答「我怎么亲手做一遍」。

琢玉是一个**本地优先**的论文复现工作台：导入一篇论文，拆解方法、补齐背景、排好计划、记录实验、完成复盘。没有后端，所有业务数据都存在浏览器 IndexedDB 里。

当前进度：**M1 论文拆解 + 知识框图**。M0 项目骨架与 M1 核心功能已可用，复现计划、记事本和复盘仍按里程碑占位。路线图与验收标准见 [PLAN.md](./PLAN.md)，产品设计见 [DESIGN.md](./DESIGN.md)。

---

## 已实现（M0）

- **项目**：首页项目列表、新建复现项目（名称、复现目标、L1/L2/L3 级别、设备与算力），刷新后数据仍在。
- **项目详情**：项目概览、论文区与五个工作标签；论文拆解和知识框图已可用，其余按计划占位。
- **论文导入**
  - 上传 PDF：pdf.js 在浏览器内逐页提取文本，显示解析进度，页数、分页文本与文件名存库；可预览每一页。
  - 元数据检索：输入 arXiv ID / arXiv URL 走 arXiv API；输入 DOI 走 OpenAlex。取回标题、作者、摘要、年份、arXiv ID、DOI 等。
  - 可以先检索元数据、之后再补传 PDF；也可以直接上传 PDF，或更换 / 移除论文。
- **本地数据层**：Dexie 持久化项目、论文、文本分块、拆解项、概念及后续里程碑的数据模型。
- **视觉**：与问渠同一套 CSS 变量色板与字体；标题霞鹜文楷（`LXGW WenKai Screen`，npm 包本地打包），正文系统中文无衬线，界面全中文。

## 已实现（M1）

- **文本分块**：按 PDF 页内偏移生成稳定 ID 的文本块，保存页码与起止偏移；支持重新分块，首次生成采用幂等写入。
- **论文拆解**：任务、数据集、模型结构、训练流程、超参、指标与原文数值、算力、代码仓库、补充材料九类事实均可手工增删改。
- **两种抽取方式**：配置 OpenAI 兼容接口后可进行 LLM 结构化抽取（zod 校验、失败重试、单类重抽）；无 Key 时使用纯本地正则启发式，无需外部服务。
- **引文可溯源**：每条拆解保存 `quote + page`，前端归一化匹配原文；不匹配标为「待核实」，可跳转对应页查看原文。
- **知识框图**：React Flow + dagre 展示概念依赖 DAG；支持节点拖拽、画布缩放、自动布局、连线与删边、循环检测，删除节点会同步清理相关依赖。
- **学习路径**：按「会 / 半会 / 不会」记录掌握度，拓扑排序生成必要概念的最短学习路径；标会后即时折叠该节点及已满足的独占前置。
- **分层资源**：按一手论文/官方仓库、教材/Wikipedia、博客/视频分层，后者明确标注「未经同行评审」；支持 Wikipedia、arXiv、GitHub 公开 API 检索及 B 站/知乎搜索跳转。
- **设置与示例**：LLM 地址、模型名和 Key 仅存本机并可一键清除；首页可一键载入「Attention Is All You Need（L2 复现）」示例，含 11 页关键文本节选、16 条示例拆解、10 个概念和 6 条依赖。

## 快速开始

要求 Node.js ≥ 20.19（已在 Node 22 验证）。

```bash
cd app
npm install
npm run dev      # 开发预览，默认 http://localhost:5173
npm test         # Vitest：分块、引文校验、拓扑与循环检测
npm run build    # 类型检查 + 生产构建，输出 app/dist
npm run preview  # 预览生产构建
```

## 目录结构

```text
zhuoyu/
├── DESIGN.md                  # 产品与设计文档
├── PLAN.md                    # M0–M5 开发计划与验收标准
├── README.md
├── app/                       # 前端应用（React + TypeScript + Vite）
│   ├── index.html             # 中文站点入口
│   ├── package.json
│   ├── vite.config.ts         # React 插件；开发环境 arXiv 代理
│   ├── public/
│   │   └── favicon.svg        # 刻刀破玉图标
│   └── src/
│       ├── main.tsx           # 挂载应用；引入霞鹜文楷与全局样式
│       ├── App.tsx            # 路由、顶栏、页脚
│       ├── index.css          # 色板、字体、全部界面样式与响应式
│       ├── pages/
│       │   ├── HomePage.tsx       # 首页：项目列表、新建项目、载入示例
│       │   ├── ProjectPage.tsx    # 项目详情与五个工作标签
│       │   └── SettingsPage.tsx   # OpenAI 兼容接口设置与一键清除
│       ├── components/
│       │   ├── BreakdownPanel.tsx # 分块、九类拆解、抽取与引文校验
│       │   ├── KnowledgeMap.tsx   # 概念 DAG、依赖编辑与学习路径
│       │   ├── ConceptDialog.tsx  # 概念卡与分层资源编辑/检索
│       │   ├── PaperSection.tsx   # 论文信息与分页原文预览
│       │   └── PaperImporter.tsx  # 上传 PDF / arXiv·DOI 检索
│       ├── db/
│       │   ├── types.ts       # 项目、分块、拆解、概念等数据模型
│       │   └── db.ts          # Dexie 数据库（zhuoyu, version 2）
│       └── lib/
│           ├── chunks.ts      # 页内偏移分块
│           ├── elements.ts    # 九类定义与无 Key 启发式抽取
│           ├── llm.ts         # LLM 请求、重试与 zod 校验
│           ├── anchors.ts     # 引文归一化与页内匹配
│           ├── graph.ts       # 学习路径与循环检测
│           ├── resources.ts   # 公开资源检索与分层
│           ├── example.ts     # Attention 内置示例
│           └── *.test.ts      # 关键纯函数单元测试
└── trae-record/               # TRAE 会话截图与使用记录（私有）
```

## 数据与隐私

- 数据库名：`zhuoyu`（IndexedDB），当前 schema 版本 `2`。
- 九张表及其主要字段：

| 表 | 内容 |
| --- | --- |
| `projects` | 标题、复现目标、级别（L1/L2/L3）、设备与算力、创建/更新时间 |
| `papers` | 论文元数据、来源、页数、分页文本、arXiv ID、DOI |
| `chunks` | 稳定分块 ID、论文与页码、页内起止偏移、文本 |
| `elements` | 拆解项：九类类型、内容、原文引文、页码、来源、校验状态 |
| `concepts` | 概念卡：解释、为何需要、难度、掌握度、依赖、画布位置、分层资源 |
| `planSteps` | 计划步骤：顺序、估时、状态、检查点、关联概念 |
| `notes` | 记事本条目：命令 / 代码 / 结果 / 报错 / 想法 / 截图，Markdown |
| `metrics` | 指标：自己的值、论文值、单位、越高越好或越低越好 |
| `retrospectives` | 复盘：范围、方法、结果、偏差归因、隐藏细节、沟通记录 |

- PDF 文本只在浏览器内解析，业务数据默认不离开本机。
- 外部请求仅由论文元数据检索（arXiv / OpenAlex）、公开资源检索（Wikipedia / arXiv / GitHub）或用户主动点击 LLM 抽取触发；公开资源检索只发送关键词，LLM 抽取只发送当前论文分块到用户配置的端点。
- LLM 地址、模型名与 API Key 保存在本机 `localStorage`，可在设置页一键清除；不写入项目数据库。
- 修改表结构时必须递增 Dexie 版本并补充迁移，避免清空用户数据。

## 论文导入说明

- **PDF**：需带文本层，扫描件暂不支持；单文件 ≤ 80 MB、≤ 300 页（M0 保护阈值）。解析后详情页会显示实际页数、总字数，并可按页查看提取文本。
- **arXiv**：支持 `1706.03762`、`arXiv:1706.03762`、`https://arxiv.org/abs/1706.03762` 等写法。
  - 开发环境通过 [vite.config.ts](./app/vite.config.ts) 中的 `/api/arxiv` 代理访问 arXiv API。
  - 生产构建是纯静态站点。arXiv API 不返回 CORS 头时，浏览器直连会被拦截；此时会自动改用 `10.48550/arXiv.<id>` 经 OpenAlex 取回同一篇论文的元数据，并给出提示。
- **DOI**：如 `10.48550/arXiv.1706.03762`，由 OpenAlex 解析。只发送编号，不发送项目内容。

## M1 使用提示

- 未配置 Key 时直接点击「启发式抽取九类」；配置 LLM 后可切换结构化抽取，也可只对某一类重抽。
- 自动重抽会在确认后替换同类非手工条目，手工新增或编辑过的条目保留；每条结果都应核对引文与页码。
- 知识框图中从节点右侧手柄连到下一概念左侧手柄；点选边后可删除，自动布局与拖拽位置会保存。
- 在学习路径点击「标会」即可观察路径折叠，恢复掌握度后路径会重新计算。
- 再次点击「载入 Attention 示例」会打开已存在的示例项目，不会覆盖你在本机做过的修改。

## 技术栈

React 19 · TypeScript · Vite 8 · React Router 7 · Dexie 4（IndexedDB）· pdf.js 6 · React Flow 13 · dagre · Zod 4 · Vitest · 霞鹜文楷 Screen（npm webfont）。

## 部署

`npm run build` 产物为纯静态文件（`app/dist`），可放到任意静态托管。由于使用 `BrowserRouter`，部署时需把未知路径回退到 `index.html`（SPA fallback），否则直接刷新 `/project/:id` 会 404。
