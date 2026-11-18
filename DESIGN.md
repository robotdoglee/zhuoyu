# 琢玉（Zhuoyu）设计与实现计划 v0.1（2026-11-18）

Slogan：如切如磋，如琢如磨。
定位：「问渠」的姊妹平台。问渠回答「前人做过吗」，琢玉回答「我怎么亲手做一遍」。
无论是否参赛都做完。工具：TRAE 报名成功则全程用 TRAE 从零开发（≥3 Session ID）；否则用 Qoder，另找比赛。

## 一、用户主线（用户理念）
目标想法 → 导入/检索文献 → 论文拆解 → 背景知识卡片/框图（可下钻：博客、视频、补充材料实验步骤）→ LLM 制定计划 → 记事本记录复现 → 复盘 → 结构化知识库导出

## 二、补充建议（Hark）
1. 复现可行性体检：代码/数据是否公开、许可证、算力需求 vs 用户设备，开工前给「难度/风险」评级。
2. 复现分级目标：L1 跑通官方代码 → L2 复现主表结果 → L3 消融/换数据/自己实现。计划与复盘按级别。
3. 掌握度与学习路径：用户在卡片上标「会/半会/不会」，框图按依赖拓扑排序生成最短学习路径，已会的折叠。
4. 资源分层：一手（论文正文、补充材料、官方仓库 README）＞ 教材/维基 ＞ 博客/视频（标「未经同行评审」）；只链接不抓取。
5. 指标对照表：记事本里录入实验指标，实时对比原文数值、显示偏差百分比。
6. 报错助手：粘贴日志，LLM 抽取关键报错并给排查建议，自动记入记事本。
7. 计划↔记事本联动：记录可勾掉检查点；卡住时一键「重新规划」。
8. 「论文没写的细节」专栏：复现中发现的隐藏超参、数据预处理等，复盘时高亮，这是最有价值的沉淀。
9. 复盘报告模板：参照 ML Reproducibility Challenge 格式（范围、方法、结果、偏差归因：数据/超参/随机种子/硬件、难易点、与作者沟通）。
10. 个人技能树：跨项目累积已掌握概念，「玉」随复现次数被雕琢成形（成长可视化）。
11. 防幻觉：每个拆解项必须带原文引文和页码，前端做字符串校验，对不上标「待核实」。
12. 本地优先：数据存 IndexedDB，LLM key 用户自带，仅存本地。

## 三、功能模块
M1 项目与导入：新建复现项目（目标、级别、设备）；导入问渠（.zhuoyu.json / BibTeX / RIS）、开放 API 检索（OpenAlex、arXiv、Semantic Scholar、Crossref）、上传 PDF。
M2 论文拆解：任务、数据集、模型结构、训练流程、超参、指标与原文数值、算力、代码仓库（GitHub API）、补充材料（arXiv / Crossref 链接），每项带引文锚点。
M3 知识框图：概念 DAG（React Flow），卡片 = 一句话解释 + 为何复现需要 + 难度 + 掌握度 + 资源列表；详情页下钻。
M4 计划：里程碑、步骤、估时、检查点、所需前置卡片；可重新规划。
M5 记事本：按步骤的条目（命令/代码/结果/报错/想法/截图），Markdown 编辑，可 @卡片、@步骤；指标对照表。
M6 复盘：自动汇总 + 用户补写，模板化。
M7 知识库导出：Markdown / Obsidian（双链）、JSON、Anki CSV、PDF 报告。

## 四、问渠衔接
问渠论文卡片加「送去琢玉」按钮：生成 .zhuoyu.json（标题、DOI、arXiv ID、摘要、OA 链接、问渠检索上下文）或 URL hash 深链。琢玉也能独立使用。

## 五、技术方案
- 前端：React + TypeScript + Vite；React Flow（框图）；pdf.js（浏览器内解析 PDF）；CodeMirror 6 / Milkdown（记事本）；Dexie（IndexedDB）；zod（LLM 结构化输出校验）；Mermaid（导出框图）。
- 后端：一个轻量 serverless 函数做 API 代理（CORS、限流、缓存），不存用户数据；部署随平台（TRAE 一键部署或 Qoder Sites）。
- LLM：OpenAI 兼容接口（Qwen / DeepSeek 等），用户自带 key；流式输出；JSON Schema 约束。
- 拆解流水线：PDF → 分页文本 + 分块(chunk id, 页码) → 拆解抽取（JSON：字段、值、引文、页码）→ 引文校验 → 概念抽取 + 依赖边 → 资源检索（Wikipedia API、GitHub 搜索、arXiv、Crossref、YouTube Data API 自带 key、DEV / HN Algolia；B 站、知乎只给搜索跳转链接）→ 计划生成。
- arXiv 论文优先用 arXiv HTML 版解析，结构比 PDF 好。
- 数据模型：Project、Paper、Element(拆解项, anchor)、Concept(deps, mastery, resources)、PlanStep、NoteEntry、Metric、Retrospective、SkillTree。

## 六、视觉（2026-11-19 定：与问渠色系、字体保持一致）
- 色板（CSS 变量）：--bg #faf9f5；--card #fffefb；--ink #1f1e1d；--ink-soft #625f57；--line #e6e2d6；--primary #3d3929；--primary-soft #f2efe6；--accent #b4552f；--accent-hover #9a411f；--accent-soft #f7ebe4；--ok #4f7044；--warn #8a5512；--err #b0413e。
- 圆角 14px；阴影 0 1px 2px rgba(60,50,30,.04), 0 6px 20px rgba(60,50,30,.05)。
- 字体：标题 "WenKai UI"/"LXGW WenKai Screen"（霞鹜文楷子集）；正文 -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC"；衬线 "Source Han Serif SC", "Noto Serif CJK SC"；等宽 ui-monospace, Menlo, Consolas。
- Icon：刻刀斜切原石，切面露出一角玉色；线条简洁，16px 也能认。

## 七、里程碑（2026）
- 11-19 ~ 11-21 M0 骨架：项目、导入、PDF 解析、本地存储
- 11-22 ~ 11-28 M1 拆解 + 知识框图（核心）
- 11-29 ~ 12-06 M2 计划 + 记事本 + 指标对照
- 12-07 ~ 12-13 M3 复盘 + 导出 + 技能树
- 12-14 ~ 12-20 M4 打磨、示例项目（建议 ResNet on CIFAR-10 或 Attention Is All You Need）、部署
- 12-21 ~ 12-24 M5 视频、截图、Session ID、作品帖；12-25 前发帖（TRAE）
TRAE 对话建议按里程碑开 Session：骨架 / 拆解 / 框图 / 计划记事本 / 复盘导出 / 部署。

## 八、风险
PDF 解析质量（扫描件先不支持）；LLM 成本（用户自带 key）；开放 API 限流（代理缓存）；TRAE 规则要求从零开发，不能复制问渠代码。
