请先完整阅读 DESIGN.md，这是「琢玉」的设计文档（问渠的姊妹平台：帮人亲手复现论文）。本次会话目标是里程碑 M0：项目骨架。

1. 先根据设计文档输出整体开发计划（按 M0–M5 里程碑拆分任务、验收标准），写入 PLAN.md。
2. 在 app/ 目录下用 React + TypeScript + Vite 从零搭建前端骨架：
   - 路由：首页（项目列表 + 新建项目）、项目详情页（标签页：论文拆解 / 知识框图 / 复现计划 / 记事本 / 复盘，先做占位）。
   - 本地存储：用 Dexie（IndexedDB）定义数据模型 Project、Paper、Element、Concept、PlanStep、NoteEntry、Metric、Retrospective。
   - 新建项目表单：复现目标、复现级别（L1 跑通官方代码 / L2 复现主表结果 / L3 消融或自己实现）、设备与算力。
   - 论文导入：上传 PDF（pdf.js 在浏览器内提取分页文本并存库），以及按 arXiv ID / DOI 检索元数据（arXiv API、OpenAlex），导入后在项目里显示论文信息和页数。
3. 视觉与姊妹产品「问渠」保持同一色系和字体，用 CSS 变量：
   --bg #faf9f5；--card #fffefb；--ink #1f1e1d；--ink-soft #625f57；--line #e6e2d6；--primary #3d3929；--primary-soft #f2efe6；--accent #b4552f；--accent-hover #9a411f；--accent-soft #f7ebe4；--ok #4f7044；--warn #8a5512；--err #b0413e；圆角 14px；阴影 0 1px 2px rgba(60,50,30,.04), 0 6px 20px rgba(60,50,30,.05)。
   标题字体 "LXGW WenKai Screen"（霞鹜文楷，可用 npm 包 lxgw-wenkai-screen-webfont 或 CDN），正文 -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif；等宽 ui-monospace, Menlo, Consolas。界面全中文，品牌名「琢玉」，副标题「如切如磋，如琢如磨」。
4. 不要后端，所有数据存在浏览器本地。完成后执行 npm install 和 npm run build 确认能编译通过，并在 README.md 写明启动方式和目录结构。
