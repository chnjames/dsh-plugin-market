# DSH 插件市场 (dsh-plugin-market)

> 在 DeepSeek Harness Web UI 里发现、浏览、确认后一键安装社区插件；同时提供可公开访问的目录网站。

版本 **v0.3.0**。目录由 CI 生成共享 `registry.json`：Vercel 站点负责浏览，DSH「设置 → 插件 → 插件市场」负责安装。本机不再各自爬 GitHub Search。

## 功能

- **设置内入口** — 设置 → 插件 →「插件市场」Tab（单列卡片：搜索、分类、简介、查看仓库 / 安装）
- **展开说明** — 点标题展开仓库 id、风险提示（若有）与 README 摘要；完整文档链到仓库
- **独立网站** — `website/` 静态站：首页、分类、详情、复制 `dsh plugin add`
- **共享目录** — Actions 定时从 GitHub `topic:dsh-plugin` 与 npm keyword 生成 `registry.json`
- **官方安装路径** — `dsh plugin --profile web add/remove`，不执行第三方 `install.sh`
- **Agent 工具** — 对话里可搜索、查看、安装插件
- **风险提示** — 公开文案启发式，默认「未评估」且不展示标签；非正式安全审计

## 使用

```bash
dsh plugin --profile web add github:chnjames/dsh-plugin-market
# 或
npx @deepseek-ai/dsh plugin --profile web add github:chnjames/dsh-plugin-market
```

安装后**重启** `dsh web`，打开 **设置 → 插件 → 插件市场**。

卡片结构：

1. 标题行：名称 · 星标 · 展开
2. 简介（最多两行）
3. 底栏：已安装 / 作者 / 提示 · **查看仓库** · **安装**（安装前确认）

> Web profile 通常关闭配置热重载；改完插件后请重启再强刷页面。

### 本地路径安装

```bash
git clone https://github.com/chnjames/dsh-plugin-market.git
cd dsh-plugin-market
npm install
cd ~/.dsh/profiles/web
pnpm add "file:/absolute/path/to/dsh-plugin-market"
```

若自动挂载未生效，把 [cordis.yml](cordis.yml) 的 insert 行追加到 `<DSH_HOME>/profiles/web/cordis.patch.yml`。

更细的安装与排障见 [INSTALL_DSH.md](INSTALL_DSH.md)；自测清单见 [INSTALL_TEST_GUIDE.md](INSTALL_TEST_GUIDE.md)。

## 公开目录站

代码在 [`website/`](website/)。Vercel 将 Root Directory 设为 `website`。

- 首页 / 分类 / 详情；每页可复制安装命令
- `/registry.json` 对 DSH 插件开放 CORS

本机插件按顺序拉取目录：

1. `https://dsh-plugin-market.vercel.app/registry.json`
2. jsDelivr（GitHub 文件）
3. GitHub raw
4. 包内 `lib/registry.snapshot.json`
5. 以上都失败且 `catalog.fallbackToSearch: true` 时，才回退本机 GitHub/npm 搜索

自定义域名时在 `cordis.patch.yml` 覆盖 `catalog.urls`。

## 配置

```yaml
- insert:
    - id: plugin-market
      name: dsh-plugin-market
      config:
        catalog:
          fallbackToSearch: true
          # urls: ["https://your-domain/registry.json"]
        ui:
          webPort: 0          # 调试用独立 HTTP 面板；0 = 关闭（产品入口是设置 Tab）
        install:
          defaultProfile: "web"
          confirmBeforeInstall: true
          # dshCommand: "npx @deepseek-ai/dsh"   # npx 运行 DSH 时取消注释
```

## 架构

```
GitHub Actions ──► registry.json ──► Vercel 网站（浏览 / CORS）
                         └──► DSH host（sql.js 缓存 + Typert Remote）
                                    └──► 设置 → 插件 → 插件市场 Tab
```

| 层 | 说明 |
|---|---|
| Host | `PluginMarketService`（`@Remote`），安装方法名为 `installPlugin` |
| Client | `$mount` Remote 后嵌套 inject `remote.pluginMarket`；React 不直接碰 `ctx.remote` |
| 分类 / 风险 | `src/utils/classifier.ts` 与 `shared/classifier.mjs` 保持同步 |
| README | Host 截断后下发；UI 再摘成可读摘要 |

审计与已知限制见 [AUDIT_REPORT.md](AUDIT_REPORT.md)。

## 开发

```bash
npm install
npm run build          # tsc + 复制 client + 写入 registry snapshot
npm run typecheck
npm run build:registry # 生成 website/public/registry.json

cd website && npm install && npm run dev
```

CI：`.github/workflows/ci.yml`（构建）、`registry.yml`（定时刷新目录）。

## 安全

- 目录只含公开元数据，不上传用户信息
- 安装走官方 CLI，不执行第三方安装脚本
- 风险字段是关键词启发式，默认未评估，**不是**权限审计
- 只安装你信任的来源

## 许可证

MIT
