TRAE 进程在上轮验收时被系统内存不足（OOM）杀掉，已重启。上轮已确认：375px 各页面无横向滚动、键盘主流程可走通、Console 0 error；Vitest 35/35、lint 0 warning、build 通过。
请只做收尾，避免再启动额外的无头 Chromium（机器内存只有 8GB）：
1. 用脚本按 index.css 的色板静态计算正文/次要文字/按钮文字与背景的对比度，确认均 ≥ 4.5:1，不达标只调深对应变量；
2. 检查所有可交互元素有 :focus-visible 焦点环；
3. 再跑一次 npm run lint、npm test、npm run build；
4. 输出 M4 验收清单逐条结果（含部署项：SPA 回退已准备，实际部署待定）。
