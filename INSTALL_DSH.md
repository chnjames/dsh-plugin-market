# dsh-plugin-market — 分发安装与使用指南

> 版本：v0.2.0（DSH 运行时适配版）
> 适用：DeepSeek Harness（web profile，Windows/macOS/Linux）
> 本文档面向**其他用户**：如何安装并使用本插件。

---

## ⚠️ 重要说明

原版 v0.1.x 使用 Koishi 风格 API（`ctx.service`、`ctx.on('ready')`、工具定义缺 `output` 字段），
与当前 DeepSeek Harness 的 Cordis 运行时**不兼容**，直接安装会挂载失败。

v0.2.0 已做运行时适配（入口 `lib/index.js`：
`ctx.provide` 注册服务、`inject: ['tools']`、工具补全 `output`/`execute` 契约、生命周期用 `ctx.effect` 清理），
且 `cordis.yml` 已改为 DSH 认可的 bundle patch 格式 —— **`dsh plugin add` 可自动挂载，无需手动编辑配置**。

---

## 一、安装步骤

### 1. 前置检查

```bash
node --version        # 需要 >= 22
pnpm --version        # 需要 pnpm（管理 profile 插件依赖）
```

确认 DSH profile 名称（本指南以 `web` 为例）：

```bash
dsh plugin list
# 或 npx @deepseek-ai/dsh plugin list
```

### 2. 安装为 profile 依赖（自动挂载）

```bash
# 从本地目录安装（推荐测试）：
cd ~/.dsh/profiles/web
pnpm add "file:/path/to/dsh-plugin-market"

# 或从 GitHub 安装（发布后）：
#   cd ~/.dsh/profiles/web && pnpm add github:your-username/dsh-plugin-market
# 或用 dsh CLI（自动识别 bundle）：
#   dsh plugin --profile web add github:your-username/dsh-plugin-market
```

> ⚠️ 如果之前用旧路径（如 Downloads）装过，务必先 `pnpm remove dsh-plugin-market` 再重装，
> 否则 lockfile 残留会继续链接旧目录。
> ⚠️ 若手动安装后插件未自动挂载（旧版 pnpm 不重读 bundle 声明），把下面「手动挂载」一节的内容
> 追加到 `<DSH_HOME>/profiles/web/cordis.patch.yml`，保存后 DSH 热加载。

### 3. 验证

```bash
# 1) 工具应出现在 Agent 工具列表（plugin_market_search 等 4 个）
# 2) Web UI 可访问
curl http://127.0.0.1:3789      # 应返回 200
# 3) 等待后台同步完成（首次约 1-2 分钟，取决于网络）
#    数据落在 <DSH_HOME>/plugin-market.db
```

---

## 二、手动挂载（备选）

如果自动挂载未生效，编辑 `<DSH_HOME>/profiles/web/cordis.patch.yml`（没有则新建，顶层为 YAML 数组），追加：

```yaml
- insert:
    - id: plugin-market
      name: dsh-plugin-market
      config:
        sources:
          github:
            enabled: true
            topic: 'dsh-plugin'
          npm:
            enabled: true
            keyword: 'dsh-plugin'
            registry: 'https://registry.npmjs.org'
        cache:
          ttl: 21600
          autoRefresh: true
          refreshInterval: 21600
        ui:
          defaultSort: 'stars'
          defaultView: 'grid'
          showRiskLevel: true
          webPort: 3789
        install:
          defaultProfile: 'web'
          autoUpdate: false
          confirmBeforeInstall: true
          dshCommand: 'dsh'
```

可选项：
- 国内网络把 `registry` 换为 `https://registry.npmmirror.com`
- GitHub API 限流时在 `sources.github` 下加 `token: 'ghp_xxx'`
- npx 运行 DSH 时把 `dshCommand` 改为 `'npx @deepseek-ai/dsh'`

---

## 三、使用方式

### 浏览器 Web UI

打开 http://localhost:3789

- 浏览插件卡片、按分类筛选（工具/界面/工作流/会话/技能/视觉/Provider/集成/开发/效率/娱乐）
- 搜索、按热度/更新时间/名称排序
- 点击卡片看详情（README、作者、版本、许可证、风险级别）
- 一键安装/卸载/更新插件（调用 `dsh plugin --profile web add/remove/update`）

### 对话中（Agent 工具）

| 说…… | 触发工具 |
|---|---|
| "搜索视觉相关插件" / "帮我找 XX 类插件" | `plugin_market_search` |
| "安装 github:owner/repo" | `plugin_market_install` |
| "我装了哪些插件" | `plugin_market_list_installed` |
| "查看 xxx 插件的详情" | `plugin_market_detail` |

---

## 四、数据与卸载

- 数据文件：`<DSH_HOME>/plugin-market.db`（sql.js，纯 JS SQLite，无原生依赖）
- 重置市场：删除该文件后重启 DSH，会自动重新同步
- 卸载插件：
  ```bash
  cd ~/.dsh/profiles/web
  pnpm remove dsh-plugin-market
  # 若手动挂载过，再从 cordis.patch.yml 移除 plugin-market 行
  ```

---

## 五、常见问题

| 现象 | 处理 |
|---|---|
| 工具没出现 / 端口没监听 | 确认已 pnpm add；必要时手动挂载（见上）；重启 DSH 或等待 HMR |
| 插件列表为空 | 等 1-2 分钟或点 Web UI 的"同步"；GitHub 未认证限流时配置 token |
| 安装按钮失败 | 检查 `install.dshCommand` 是否匹配你的 DSH 运行方式（dsh / npx） |
| 端口被占用 | 修改 `ui.webPort` |
| 同步失败 | 检查网络；npm 换镜像源 |

---

## 六、分发建议

- **GitHub 分发**：把本目录推到仓库（含 `lib/`、`src/`、`package.json`、`cordis.yml`、`INSTALL_DSH.md`），用户按步骤 2 安装。
- **npm 分发**：`npm publish` 后用户 `cd ~/.dsh/profiles/web && pnpm add dsh-plugin-market`，自动挂载。
- v0.2.0 起 `dsh.bundle.patch` 指向 `cordis.yml`，`dsh plugin add` 会自动把该行加入 profile 组合。
