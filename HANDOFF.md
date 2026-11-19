# 琢玉交接文档

> 更新于 2026-11-19 13:14（北京时间）。给项目作者本人日后接手用：照着这份文档就能在任何电脑上继续开发。

## 一句话现状

M0–M4 已完成并在 TRAE 中开发；v1 已用 TRAE 自带部署上线：https://37km306o1q81r6izvma.traesite.cn（公开访问）。M4.1 用户实测修复（拆解卡片详情抽屉、首页一键载入示例）已完成并上线；下一里程碑是 M5：介绍页、演示视频、截图整理、补 Session ID、发帖。

## 比赛关键信息

- 赛事：TRAE 比赛，截止 **2026-12-25（北京时间）**；M5 计划在 2026-12-21 ~ 2026-12-24 完成。
- 硬性要求：全程用 TRAE 开发；每个重要步骤留截图和 Session ID；公开材料只写「上海交通大学」，不写姓名、学位、手机号、账号。
- 只用免费资源，不升级套餐，不注册新的第三方平台。

## 如何接手

1. 克隆私有仓库：`git clone https://github.com/robotdoglee/zhuoyu.git`（需要能访问该私有仓库的 GitHub 账号）。
2. 安装 TRAE CN（开发时用的是 1.107.1），登录自己的 TRAE 账号，打开仓库目录，使用 SOLO 模式。
3. 本地运行：
   ```bash
   cd app
   npm install
   npm run dev      # 开发
   npm test         # Vitest，当前 14 个测试文件、49 条用例全部通过
   npm run lint     # oxlint，0 error
   npm run build    # 产物在 app/dist，含 _redirects 与 404.html（SPA 回退）
   ```
4. 部署：在 TRAE 左侧 **My Sites** 更新同一个站点（一键部署），不要新建站点，不要上传 `.env`、`trae-record/` 或任何个人信息。
5. 每完成一个重要步骤：截图存 `trae-record/screenshots/`（命名 `YYYY-MM-DD_HHMM_序号-说明.png`），在 `trae-record/SESSIONS.md` 加一行，提示词存 `trae-record/prompts/`（按序号递增），然后 commit + push，commit 信息带 Session ID。

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| `README.md` | 功能说明（按里程碑） |
| `PLAN.md` | 路线图与验收标准 |
| `DESIGN.md` | 产品与视觉设计（与问渠同一套色板、霞鹜文楷） |
| `app/` | 前端源码（React + Vite，Dexie/IndexedDB 本地存储，无后端） |
| `trae-record/prompts/` | 发给 TRAE 的全部提示词，01 ~ 12 |
| `trae-record/screenshots/` | 过程截图 |
| `trae-record/SESSIONS.md` | 每步记录与 Session ID |

## 里程碑

- [x] M0 骨架：项目、论文导入（PDF / arXiv / DOI）、本地数据层
- [x] M1 论文拆解 + 知识框图 + 学习路径 + 分层资源
- [x] M2 三级复现计划、记事本、指标对照、报错助手
- [x] M3 复盘、导出、个人技能树
- [x] M4 打磨、双示例（Attention、ResNet）、静态部署
- [x] M4.1 用户实测修复（卡片详情、示例导入）已完成并上线
- [ ] M5 介绍页、演示视频、截图、Session ID、发帖

## 进行中（提示词 12）

用户在线上实测发现：
1. 论文拆解页的卡片点击后应能打开详情（原文依据与页码、详细解释、关键数字、关联卡片与知识点、跳转到框图/计划）。
2. 首页「一键导入示例」按钮点了没反应，只有点 Attention 示例卡片才有内容；需保证所有示例都能导入并跳转。

进度：2026-11-19 11:01 已完成并重新部署（截图 38）。

修复完成后要：测试通过、手机宽度与桌面实测、Console 0 error、重新部署到同一站点。提示词全文见 `trae-record/prompts/12-fix-cards-example.md`。

## 待办

1. [x] 确认提示词 12 的修复已上线，并在线上复测两处问题。
2. 作者本人完整测一遍线上版，汇总反馈再修。
3. 做介绍页（截图 + 使用流程，可以是静态页或 README 一节）。
4. 补 `SESSIONS.md` 中第 19 行之后标「待查」的 Session ID（在 TRAE 任务历史里查）。
5. 录制演示视频，整理截图，写比赛帖（帖子只写学校）。
6. 公开仓库前先清理个人信息；目前保持私有。

## 注意事项

- 系统的「保存/打开文件」对话框会卡住 TRAE 的自动操作，导出功能测试时注意。
- 机器内存小时 TRAE 容易因多开浏览器崩溃，尽量只用 TRAE 内置浏览器。
- 所有项目数据存在测试者自己浏览器的 IndexedDB 里，换浏览器看不到之前的数据属正常现象。
- LLM Key 只存本机，绝不提交到仓库或写进前端代码。
