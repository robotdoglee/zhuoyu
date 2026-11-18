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
