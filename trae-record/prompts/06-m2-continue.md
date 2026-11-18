「琢玉」M2 继续（上一会话因环境重启中断）。M2 代码已部分写入：app/src/components/PlanPanel.tsx、MetricTable.tsx，lib/plan.ts、planLlm.ts、metrics.ts、errorAssistant.ts 及对应测试，db.ts/types.ts/example.ts/ProjectPage.tsx 已改。请先通读这些文件与 PLAN.md 第 4 节、trae-record/prompts/05-m2-plan-notebook-metrics.md，核对 M2-1 ~ M2-7 哪些已完成、哪些缺失，然后补齐（记事本、计划↔记事本联动、重新规划版本记录等如未完成请实现）。
要求不变：UI 全中文，色系字体严格按 DESIGN.md 第六节；schema 升级带迁移。
完成后：npm run build 通过；npm run dev 后在浏览器逐项验收 PLAN.md 4.2 五条标准，Console 零报错；更新 README；总结改动与验收结果。
