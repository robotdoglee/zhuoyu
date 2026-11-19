# TRAE 使用记录（琢玉）

> 私有记录：截图 + Session ID，仓库公开前删除账号/手机号等具体信息。

| 日期时间 (CST) | 任务 | Session ID | 截图 | 备注 |
|---|---|---|---|---|
| 2026-11-18 22:54 | 安装 TRAE CN 3.4.20 (Linux arm64)，首次启动 | — | screenshots/2026-11-18_2254_01-first-launch.png | |
| 2026-11-18 22:54 | 登录（个人用户） | — | screenshots/2026-11-18_2254_02-login-choice.png | |
| 2026-11-19 00:03 | 登录成功（个人账号，2,000 积分） | — | screenshots/2026-11-19_0003_03-logged-in.png | 沙箱无系统钥匙串，选择 weaker encryption |
| 04 | 2026-11-19 00:26 | 任务「琢玉 M0 项目骨架搭建」：粘贴提示词（prompts/01-m0-skeleton.md），Agent 模式 + Auto Approval | 6afdd1bc651900d875a50bcf | screenshots/2026-11-19_0026_04-m0-prompt.png |
| 05 | 2026-11-19 00:27 | TRAE 读取 DESIGN.md、开始规划 | 同上 | screenshots/2026-11-19_0027_05-m0-running.png |
| 06 | 2026-11-19 00:31 | PLAN.md 完成，开始 Vite 脚手架与依赖安装 | 同上 | screenshots/2026-11-19_0031_06-plan-done-scaffolding.png |
| 07 | 2026-11-19 00:38 | 骨架与主题完成；TRAE 内置 Browser Use Agent 测试 arXiv 导入（1706.03762） | 同上 | screenshots/2026-11-19_0038_07-arxiv-import-preview.png |
| 08 | 2026-11-19 00:40 | M0 完成：21 文件 +3944/-415，build 通过，arXiv/PDF 导入冒烟测试通过；Keep All | 6afdd1bc651900d875a50bcf | screenshots/2026-11-19_0040_08-m0-completed.png |
| 09 | 2026-11-19 01:10 | 新任务 M1 论文拆解+知识框图：提示词 prompts/02-m1-decompose-graph.md | 6afddac8651900d875a50d19 | screenshots/2026-11-19_0110_09-m1-prompt.png |
| 10 | 2026-11-19 01:38 | M1 核心功能实现（分块、LLM 设置、拆解、DAG），8 个单测通过，进入浏览器验收 | 6afddac8651900d875a50d19 | screenshots/2026-11-19_0138_10-m1-core-done-testing.png |
| 11 | 2026-11-19 01:52 | M1 浏览器自测发现 Wikipedia 返回结构解析异常，TRAE 自行定位修复 | 6afddac8651900d875a50d19 | screenshots/2026-11-19_0152_11-m1-selftest-bugfix.png |
| 12 | 2026-11-19 02:04 | M1 知识框图 DAG 已渲染；TRAE 服务端报 Unknown system error (600) 中断，发送「继续」恢复 | 6afddac8651900d875a50d19 | screenshots/2026-11-19_0204_12-m1-graph-error-600.png |
| 13 | 2026-11-19 02:20 | 学习路径已出（7 步按依赖）；TRAE 定位 React Flow 选择状态死循环（Maximum update depth）时再遇 600 错误中断 | 6afddac8651900d875a50d19 | screenshots/2026-11-19_0220_13-m1-learning-path-error-600.png |
| 14-16 | 2026-11-19 02:21-02:23 | 新任务「Fix Knowledge Graph…」接手 M1 收尾（prompts/04）；遇 Service unavailable，Restart Service 后重试成功 | 6afdeca2651900d875a50fda | screenshots/2026-11-19_0222_15-service-unavailable.png, screenshots/2026-11-19_0223_16-m1-fix-task-running.png |
| 17 | 2026-11-19 02:38 | 死循环修复（受控状态 + Dexie 写入时机），Console 0 报错，Browser Use Agent 逐项验收 DAG 联动 | 6afdeca2651900d875a50fda | screenshots/2026-11-19_0238_17-m1-loop-fixed-console-0.png |
| 18 | 2026-11-19 03:04 | 本地链式代理凭据过期导致 TRAE 弹 Proxy 407、任务报 600 中断；已重启代理（curl 200），死循环修复已 Keep All，build 通过 | 6afdeca2651900d875a50fda | screenshots/2026-11-19_0304_18-proxy-407-error-600.png |
| 19 | 2026-11-19 03:26 | M1 收尾验收完成（新任务“完成项目验收与更新 README”）：示例项目 10 节点 6 边、学习路径 7 步、无 key 启发式拆解 24 条（全部核实）、Console 0 error、npm run build 通过；修复 StrictMode 重复写入 ConstraintError（bulkPut），README 更新至 M1。npm test 被 TRAE 沙箱拦截未执行 | 待查 | screenshots/2026-11-19_0328_19-m1-acceptance-done.png |
| 20 | 2026-11-19 03:29 | M2 开始：新任务“实现琢玉M2核心功能模块”，提示词 prompts/05-m2-plan-notebook-metrics.md | 待查 | screenshots/2026-11-19_0329_20-m2-prompt-sent.png |
| 21 | 2026-11-19 04:04 | 运行环境重启，TRAE 进程丢失；M2 进行中任务报 Model Request failed (3003)。已提交 WIP 快照 fb695e2，重装并重启 TRAE | 待查 | screenshots/2026-11-19_0405_21-sandbox-restart-3003.png |
| 22 | 2026-11-19 04:08 | M2 续接提示词 prompts/06-m2-continue.md，同一任务继续 | 待查 | screenshots/2026-11-19_0408_22-m2-continue.png |
| 23 | 2026-11-19 04:26 | M2：补齐记事本面板 NotebookPanel、计划↔记事本联动；build 通过、lint 0；浏览器验收中（复现计划页 L2、一键重新规划 v2、Console 0） | 待查 | screenshots/2026-11-19_0426_23-m2-plan-ui-acceptance.png |
| 24 | 2026-11-19 05:01 | M2 完成：L1/L2/L3 计划差异、刷新持久化、指标偏差（24 vs 27.3 → -12.09%，方向变色）、无 key 报错助手零请求、重排 v2 + v1 快照；build 通过，Vitest 16/16，Console 无错误/警告，README 更新 | 待查 | screenshots/2026-11-19_0501_24-m2-complete.png |
| 25 | 2026-11-19 05:03 | M3 开始：新任务“实现琢玉 M3 复盘与导出”，提示词 prompts/07-m3-retro-export-skilltree.md | 待查 | screenshots/2026-11-19_0503_25-m3-prompt-sent.png |
| 26 | 2026-11-19 05:39 | M3 导出验收时内置浏览器弹出系统“另存为”对话框阻塞（另有 ~/.config 写权限提示）；人工把两份导出存到临时目录后对话框清空 | 待查 | screenshots/2026-11-19_0539_26-m3-export-save-dialog.png |
| 27 | 2026-11-19 05:41 | M3 导出面板：Markdown / Obsidian 笔记包 / JSON / Anki CSV / PDF 报告，仅本地生成；TRAE 继续做真实下载核对 | 待查 | screenshots/2026-11-19_0541_27-m3-export-panel.png |
| 28 | 2026-11-19 05:57 | M3 浏览器验收：项目页、PDF 10 页 A4 + Mermaid 渲染、技能树同名去重 | 待查 | screenshots/2026-11-19_0557_28-m3-project-page.png |
| 29 | 2026-11-19 06:26 | M3 完成：复盘关键事实与指标表一致（BLEU 偏差 −1.47% / −1.06%）；五种导出真实下载检查（Obsidian 40 篇/151 双链/缺失 0；JSON schema v4 不含 Key；Anki UTF-8 BOM 10 张；PDF 10 页）；同名 Softmax 只计一次、保留两个来源；Console 0 error；lint 0 error（11 个 React 类警告待修） | 待查 | screenshots/2026-11-19_0626_29-m3-complete.png |
| 30 | 2026-11-19 06:29 | M4 打磨与示例 prompt 发送（prompts/08-m4-polish.md；不含部署） | 待查 | screenshots/2026-11-19_0629_30-m4-prompt-sent.png |
| 31 | 2026-11-19 07:23 | M4 进行中：ResNet 示例、统一状态组件、分页、101 页 PDF 分批解析完成；代理凭据过期导致 973 中断，重启 chainproxy | 待查 | screenshots/2026-11-19_0724_31-m4-proxy-973.png |
| 32 | 2026-11-19 07:25 | M4 继续（prompts/09-m4-continue.md）：移动端/可访问性/lint/README | 待查 | screenshots/2026-11-19_0725_32-m4-continue.png |
| 33 | 2026-11-19 07:54 | TRAE 在 M4 验收（无头 Chromium + tsc）时被系统 OOM 杀掉；代码已落盘：Vitest 35/35、oxlint 0 warning、build 通过 | 待查 | — |
| 34 | 2026-11-19 08:06 | 重启 TRAE 后发送 M4 收尾 prompt（prompts/10-m4-finish.md）：对比度静态计算、焦点环、终验 | 待查 | screenshots/2026-11-19_0806_34-m4-finish-prompt.png |
