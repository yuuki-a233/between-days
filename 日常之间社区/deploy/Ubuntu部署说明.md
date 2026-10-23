# Ubuntu 部署说明

本阶段不需要域名，不配置真实发信邮箱，不开放公网访问。推荐先完成本机体验，再按以下步骤在自己的 Ubuntu 服务器内测。以下操作尚未在你的服务器执行。

## 1. 检查现有环境

记录 Ubuntu 版本、CPU/内存、可用磁盘，以及正在运行的网站。准备 Node.js 24.15 或更高版本。不要覆盖已有网站目录、修改已有 Nginx 站点，也不要开放数据库或开发端口到公网。

把源码包解压到独立目录，例如用户自己的 `~/between-days-test`。不要复制 Windows 的 `node_modules`，Linux 会根据锁文件安装对应依赖。

## 2. 启动封闭测试

```bash
cd ~/between-days-test
bash start-local.sh
```

首次启动会安装依赖并创建数据库。服务仅监听 `127.0.0.1:3100`。保持当前会话运行，或使用你自己的终端会话管理工具；不需要安装 Docker。

在你的电脑另开终端，建立 SSH 端口转发：

```bash
ssh -L 3100:127.0.0.1:3100 YOUR_USER@YOUR_SERVER_IP
```

保持 SSH 连接打开，用电脑浏览器访问 http://localhost:3100 ，使用三个测试邮箱和测试收件箱体验。服务器安全组无需开放 3100。只向受信任的测试者提供适当权限的独立 SSH 转发访问，不共享管理员密码。

## 3. 数据与备份

默认数据目录是项目下的 `data/`，建议定期执行：

```bash
node scripts/backup.ts
```

将备份另存一份到服务器之外。恢复方法见项目 `README.md`。更新源码时保留数据目录，不用删除或覆盖数据库。

## 4. 以后转为正式运行

这一节是准备清单，不会由启动脚本自动执行：

- 准备正式域名，并核实大陆站点备案分类及适用上线要求。
- 配置域名解析、HTTPS、真实的验证码发信服务，以及公开互动适用的身份核验方案。
- 使用独立生产数据目录，不把本地测试账号、测试收件箱邮件和示例数据直接复制到生产。
- 设置 `.env.example` 列出的生产变量，尤其是 `APP_MODE=production`、`MAIL_MODE=smtp`、`APP_URL`、`OWNER_EMAIL`、`AUTH_SECRET` 与 SMTP 配置。
- `AUTH_SECRET` 用 `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` 生成。凭据放入受保护的服务器环境文件，不写入源码包。
- `CLOSED_BETA=true` 继续限制允许登录的邮箱；正式开放注册前，再评估与配置所需身份核验和内容管理。

环境变量可放在权限为 `600` 的 `/etc/between-days.env`，供 systemd 读取。真实部署时需创建对应专用用户并调整目录所有者。

```bash
node vendor/npm/bin/npm-cli.js ci --no-audit --no-fund
node scripts/build.mjs
# 确认生产环境变量已载入后：
node scripts/launch.mjs start
```

提供了 `between-days.service` 和 `nginx.example.conf` 作为配置模板。先替换路径、用户、域名和证书位置，检查服务器实际环境，再决定是否安装服务；本包不会自动启用这些模板。

## 5. 验证与回退

部署后检查登录邮件、权限审批、评论、附件下载、备份恢复，以及服务重启后的数据完整性。升级前备份数据库和文件；若需恢复，先停止服务，再恢复完整快照和相匹配的应用版本。不要通过删除 `data/` 来修复启动问题。
