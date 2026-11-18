「琢玉」M1 收尾（上一会话因服务端 600 错误中断两次，这里接手）。请先读 PLAN.md 第 3 节和 app/src 下与知识框图相关的代码。

1. 修复知识框图页 Console 中的 "Maximum update depth exceeded"：React Flow 节点选择 / onNodesChange 与 Dexie 状态同步形成更新死循环。请改为受控状态 + 仅在拖拽结束或增删时写库，避免在渲染中 setState。
2. 修复后在浏览器里逐项验收 PLAN.md 3.2 的六条标准（引文篡改→待核实、DAG 增删节点边同步、掌握度改「会」后学习路径即时更新、资源分层与「未经同行评审」标签、示例项目一键载入、无 key 时启发式拆解可用），Console 必须零报错。
3. npm run build 通过，更新 README.md，最后用一段话总结 M1 完成情况和遗留问题。
请控制每次读取的文件范围，避免一次性读入过多内容。
