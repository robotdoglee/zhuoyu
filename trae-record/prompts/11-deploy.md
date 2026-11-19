请把琢玉部署上线，供真实用户测试：
1. 在 app/ 下 npm run build，产物为 app/dist（纯静态 SPA，已含 _redirects 与 404.html 回退）。
2. 使用 TRAE 自带的部署能力（My Sites / 一键部署）发布 app/dist，不要引入需要另开账号的第三方平台。
3. 部署后确认：首页能打开；直接访问一个子路由（如 /project/1、/skills）刷新不 404；载入示例项目正常；Console 0 error。
4. 不要上传 .env、trae-record 或任何个人信息；不要打开系统文件选择/另存为对话框。
5. 最后给出线上地址和检查结果。
