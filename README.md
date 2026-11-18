# 琢玉 Zhuoyu

> 如切如磋，如琢如磨。  
> 问渠的姊妹平台：问渠回答「前人做过吗」，琢玉回答「我怎么亲手做一遍」。

琢玉是一个**本地优先**的论文复现工作台：导入一篇论文，拆解方法、补齐背景、排好计划、记录实验、完成复盘。没有后端，所有业务数据都存在浏览器 IndexedDB 里。

当前进度：**M0 项目骨架**。路线图与各里程碑验收标准见 [PLAN.md](./PLAN.md)，产品设计见 [DESIGN.md](./DESIGN.md)。

---

## 已实现（M0）

- **项目**：首页项目列表、新建复现项目（名称、复现目标、L1/L2/L3 级别、设备与算力），刷新后数据仍在。
- **项目详情**：项目概览 + 五个标签页占位（论文拆解 / 知识框图 / 复现计划 / 记事本 / 复盘）。
- **论文导入**
  - 上传 PDF：pdf.js 在浏览器内逐页提取文本，显示解析进度，页数、分页文本与文件名存库；可预览每一页。
  - 元数据检索：输入 arXiv ID / arXiv URL 走 arXiv API；输入 DOI 走 OpenAlex。取回标题、作者、摘要、年份、arXiv ID、DOI 等。
  - 可以先检索元数据、之后再补传 PDF；也可以直接上传 PDF，或更换 / 移除论文。
- **本地数据层**：Dexie 定义 `Project / Paper / Element / Concept / PlanStep / NoteEntry / Metric / Retrospective` 八张表。
- **视觉**：与问渠同一套 CSS 变量色板与字体；标题霞鹜文楷（`LXGW WenKai Screen`，npm 包本地打包），正文系统中文无衬线，界面全中文。

## 快速开始

要求 Node.js ≥ 20.19（已在 Node 22 验证）。

```bash
cd app
npm install
npm run dev      # 开发预览，默认 http://localhost:5173
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
│       │   ├── HomePage.tsx       # 首页：品牌区、项目列表、新建入口
│       │   └── ProjectPage.tsx    # 项目详情：概览、论文区、五个标签占位
│       ├── components/
│       │   ├── BrandMark.tsx      # 刻刀斜切原石、露出玉色的 Logo
│       │   ├── NewProjectDialog.tsx
│       │   ├── PaperSection.tsx   # 论文信息、页数、分页文本预览
│       │   └── PaperImporter.tsx  # 上传 PDF / arXiv·DOI 检索
│       ├── db/
│       │   ├── types.ts       # 八类数据模型与复现级别定义
│       │   └── db.ts          # Dexie 数据库（zhuoyu, version 1）
│       └── lib/
│           ├── pdf.ts         # pdf.js 浏览器内分页文本提取
│           ├── metadata.ts    # arXiv API / OpenAlex 检索与解析
│           └── format.ts      # 日期、作者、数字格式化
└── trae-record/               # TRAE 会话截图与使用记录（私有）
```

## 数据与隐私

- 数据库名：`zhuoyu`（IndexedDB），当前 schema 版本 `1`。
- 八张表及其主要字段：

| 表 | 内容 |
| --- | --- |
| `projects` | 标题、复现目标、级别（L1/L2/L3）、设备与算力、创建/更新时间 |
| `papers` | 论文元数据、来源、页数、分页文本、arXiv ID、DOI |
| `elements` | 拆解项：类型、值、原文引文、页码、校验状态 |
| `concepts` | 概念卡：解释、为何需要、难度、掌握度、依赖、资源分层 |
| `planSteps` | 计划步骤：顺序、估时、状态、检查点、关联概念 |
| `notes` | 记事本条目：命令 / 代码 / 结果 / 报错 / 想法 / 截图，Markdown |
| `metrics` | 指标：自己的值、论文值、单位、越高越好或越低越好 |
| `retrospectives` | 复盘：范围、方法、结果、偏差归因、隐藏细节、沟通记录 |

- PDF 文本只在浏览器内解析，不上传。
- 唯一的网络请求是论文元数据检索（arXiv / OpenAlex）与按需加载的字体子集。
- 修改表结构时必须递增 Dexie 版本并补充迁移，避免清空用户数据。

## 论文导入说明

- **PDF**：需带文本层，扫描件暂不支持；单文件 ≤ 80 MB、≤ 300 页（M0 保护阈值）。解析后详情页会显示实际页数、总字数，并可按页查看提取文本。
- **arXiv**：支持 `1706.03762`、`arXiv:1706.03762`、`https://arxiv.org/abs/1706.03762` 等写法。
  - 开发环境通过 [vite.config.ts](./app/vite.config.ts) 中的 `/api/arxiv` 代理访问 arXiv API。
  - 生产构建是纯静态站点。arXiv API 不返回 CORS 头时，浏览器直连会被拦截；此时会自动改用 `10.48550/arXiv.<id>` 经 OpenAlex 取回同一篇论文的元数据，并给出提示。
- **DOI**：如 `10.48550/arXiv.1706.03762`，由 OpenAlex 解析。只发送编号，不发送项目内容。

## 技术栈

React 19 · TypeScript · Vite 8 · React Router 7 · Dexie 4（IndexedDB）· pdf.js 6 · 霞鹜文楷 Screen（npm webfont）。

## 部署

`npm run build` 产物为纯静态文件（`app/dist`），可放到任意静态托管。由于使用 `BrowserRouter`，部署时需把未知路径回退到 `index.html`（SPA fallback），否则直接刷新 `/project/:id` 会 404。
