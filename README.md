# 🔌 DSH 插件市场 (dsh-plugin-market)

> 在 DSH 内发现、浏览、安装和管理社区插件

DSH 插件市场是一个 DeepSeek Harness (DSH) 插件，为 DSH 生态提供"应用商店"式体验。从 GitHub 和 npm 自动索引社区插件，提供分类浏览、搜索、一键安装等功能。

## ✨ 功能特性

- **🔍 插件发现** — 自动索引 GitHub（topic: dsh-plugin）和 npm 上的所有社区插件
- **📂 分类浏览** — 12 个分类：工具增强、界面美化、工作流、会话管理、技能扩展、视觉能力等
- **🔎 智能搜索** — 支持按名称、描述、关键词、作者搜索
- **📊 多种排序** — 按热度（Stars）、更新时间、名称排序
- **⚡ 一键安装** — 点击按钮直接安装，无需复制命令
- **📦 插件详情** — 查看 README、作者、版本、许可证、风险级别
- **💾 本地缓存** — sql.js 纯 JS SQLite，零编译依赖，6 小时自动刷新
- **🎯 风险提示** — 自动推断插件风险级别（安全/低/中/高/未知）
- **🌐 独立 Web UI** — 内置 Web 面板，浏览器直接访问
- **🤖 Agent 工具** — 注册工具，让 Agent 也能搜索和安装插件
- **🔄 热插拔** — 遵循 Cordis 插件规范，可随时安装卸载

## 🚀 快速开始

### 前置说明：你的 DSH 是怎么运行的？

DSH 有两种常见运行方式，安装插件的命令略有不同：

- **全局安装**：`npm install -g @deepseek-ai/dsh` → 用 `dsh` 命令
- **npx 运行**：`npx @deepseek-ai/dsh web` → 用 `npx @deepseek-ai/dsh` 命令

> 💡 不知道自己是哪种？在终端输入 `dsh --version`，有输出版本就是全局安装，报错就是 npx 方式。

### 安装

#### 方式 1：从 GitHub 安装（推荐）

**全局安装 DSH 的用户：**
```bash
dsh plugin --profile web add github:your-username/dsh-plugin-market
```

**使用 npx @deepseek-ai/dsh 的用户：**
```bash
npx @deepseek-ai/dsh plugin --profile web add github:your-username/dsh-plugin-market
```

#### 方式 2：克隆到本地

```bash
git clone https://github.com/your-username/dsh-plugin-market.git
cd dsh-plugin-market
npm install
npm run build
```

然后用本地路径安装：
```bash
# 全局 dsh
dsh plugin --profile web add /path/to/dsh-plugin-market

# 或 npx
npx @deepseek-ai/dsh plugin --profile web add /path/to/dsh-plugin-market
```

### npx 用户的额外配置

如果你使用 `npx @deepseek-ai/dsh web` 运行 DSH，插件市场内部的「一键安装」功能需要知道 dsh 命令在哪。有两种方式：

**方式 A：自动检测（默认）**
插件会自动检测可用的 dsh 命令——先试全局 `dsh`，找不到就试 `npx @deepseek-ai/dsh`。大多数情况下无需额外配置。

**方式 B：显式配置（推荐，更稳定）**
在 DSH 的 `cordis.patch.yml` 中添加：
```yaml
- id: plugin.market
  config:
    install:
      dshCommand: "npx @deepseek-ai/dsh"
```
这样插件就直接用 npx 命令安装其他插件，不会每次检测。

### 使用

安装并启动 DSH 后，插件市场会自动启动。

**访问 Web UI 面板：**

打开浏览器访问 `http://localhost:3789`

**使用 Agent 工具：**

在 DSH 对话中，你可以让 Agent 帮你：

- 搜索插件：`帮我找几个和视觉相关的插件`
- 安装插件：`安装 dsh-automation 插件`
- 查看已安装：`我现在装了哪些插件？`

## ⚙️ 配置

在 DSH 的 `cordis.patch.yml` 中可以自定义配置：

```yaml
- id: plugin.market
  name: plugin-market
  path: dsh-plugin-market
  config:
    sources:
      github:
        enabled: true
        topic: "dsh-plugin"
        token: ""        # 可选：GitHub Token，提高 API 速率限制
      npm:
        enabled: true
        keyword: "dsh-plugin"
        registry: "https://registry.npmjs.org"

    cache:
      ttl: 21600           # 缓存过期时间（秒），默认 6 小时
      autoRefresh: true    # 是否自动刷新
      refreshInterval: 21600  # 刷新间隔（秒）

    ui:
      defaultSort: "stars"   # 默认排序: stars / updated / name
      defaultView: "grid"    # 默认视图: grid / list
      showRiskLevel: true    # 是否显示风险级别
      webPort: 3789          # Web UI 端口，设为 0 禁用

    install:
      defaultProfile: "web"   # 默认安装到哪个 profile
      autoUpdate: false       # 是否自动更新插件
      confirmBeforeInstall: true  # 安装前是否确认
```

## 🏗️ 架构

```
┌─────────────────────────────────────────┐
│              Web UI 面板                 │
│  搜索 / 分类 / 卡片 / 详情 / 安装        │
└──────────────────┬──────────────────────┘
                   │ HTTP API
┌──────────────────▼──────────────────────┐
│           Indexing Service              │
│  GitHub API + npm Registry → 分类推断    │
│  → 风险推断 → SQLite 缓存                │
├─────────────────────────────────────────┤
│          Installer Service              │
│  调用 dsh plugin CLI → 安装/卸载/更新    │
├─────────────────────────────────────────┤
│          Cordis Plugin Context          │
│  服务注册 / 工具注册 / 事件系统          │
└─────────────────────────────────────────┘
```

## 📁 项目结构

```
dsh-plugin-market/
├── package.json              # 包定义
├── cordis.yml                # DSH bundle 配置
├── tsconfig.json             # TypeScript 配置
├── README.md                 # 文档
└── src/
    ├── index.ts              # 插件入口
    ├── types.ts              # 类型定义
    ├── db/
    │   └── cache.ts          # SQLite 缓存层
    ├── services/
    │   ├── indexing.ts       # 索引服务
    │   └── installer.ts      # 安装服务
    ├── ui/
    │   └── web-server.ts     # Web UI 服务器
    └── utils/
        ├── github-api.ts     # GitHub API 封装
        ├── npm-api.ts        # npm API 封装
        ├── classifier.ts     # 分类与风险推断
        └── dsh-cli.ts        # dsh 命令封装
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 类型检查
npm run typecheck

# 清理构建产物
npm run clean
```

## 🛡️ 安全说明

- 插件市场仅索引公开的 GitHub 和 npm 数据，不上传任何用户信息
- 所有插件数据缓存在本地 SQLite 数据库
- 安装操作通过官方 `dsh plugin` CLI 执行
- 每个插件会标记风险级别，请谨慎安装高风险插件
- 仅安装您信任的来源的插件

## 📝 MVP 范围

当前版本为 MVP，包含核心功能：

- ✅ GitHub + npm 双源索引
- ✅ 分类浏览与搜索
- ✅ 一键安装/卸载
- ✅ 插件详情与 README 展示
- ✅ 独立 Web UI 面板
- ✅ Agent 工具集成
- ✅ 本地缓存与自动刷新
- ✅ 风险级别自动推断

后续计划：
- ⏳ 插件评分与评论
- ⏳ 插件合集（Bundle 推荐）
- ⏳ 兼容性检测
- ⏳ 安全扫描
- ⏳ DSH Web UI 原生注入（替代独立面板）

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 PR！

---

**DSH 插件市场** — 让 DSH 生态更繁荣 🐳
