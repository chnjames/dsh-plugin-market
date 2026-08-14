# DSH 插件市场 · 审计与自检报告

> 项目：dsh-plugin-market **v0.3.0**  
> 审计时间：2026-08-14  
> 范围：Host（Typert Remote）+ 浏览器 Client（设置 Tab）+ 共享分类器 + 公开目录站 + README 展示 + 风险启发式  
> 方法：读源码、对 1125 条 `registry.json` 全量重打分、对照旧规则统计误报

本报告记录的是**当前实现的真实状态**，不是愿望清单。旧版 v0.1 报告（独立 overlay、better-sqlite3、`ctx.service`）已经过时。

---

## 1. 当前架构（事实）

共享一份 CI 生成的 `website/public/registry.json`：

| 面 | 入口 | 职责 |
|---|---|---|
| CI | `.github/workflows/registry.yml` + `scripts/build-registry.mjs` | 爬 `topic:dsh-plugin` / npm keyword，写入目录 |
| 网站 | `website/` Next.js `output: 'export'` | 浏览、复制 `dsh plugin add`，**不在浏览器里安装** |
| DSH 插件 | 设置 → 插件 → **插件市场** Tab（`settings.plugins.tab`，id `market`，order 20） | 搜索、展开详情、确认后走官方 CLI 安装 |

Host 侧 `PluginMarketService` 继承 `TypertRemoteService`，`super(ctx, 'pluginMarket')`，方法用 `@Remote`。浏览器半先 `$mount` contribution，再在嵌套 fiber 里 `inject` `remote.pluginMarket`。React **不**直接碰 `ctx.remote`。

安装 wire 名是 **`installPlugin`**，不能叫 `install`：客户端 `RemoteNamespaceService` 已占用 `install()`。

目录拉取顺序：Vercel → jsDelivr → GitHub raw → 包内 `lib/registry.snapshot.json` → 最后才回落到本机 GitHub/npm 搜索。

调试 HTTP 面板 `src/ui/web-server.ts` 仍保留，默认 `ui.webPort: 0` **关闭**。产品入口不是侧栏按钮，也不是独立站点上的「一键安装」。

---

## 2. README 展示：问题与处理

### 2.1 原来为什么乱

GitHub README 通常是徽章墙 + HTML 居中图 + 表格 + ASCII + 安装章节。旧 UI 把原文丢进卡片里的 `<pre>`（约 360px 双列、`max-height: 28vh`）。结果是：

- 徽章 Markdown（`[![...](...)`]）铺满屏幕
- 表格 `| col | col |` 挤成乱码
- 和插件同名的 `# Title` 重复出现
- Host 可能下发整份 README（现已截断 12k，抓取上限 20k）

这不是「Markdown 渲染不够炫」，是**在设置面板里放错了信息密度**。

### 2.2 现在的页面结构

展开一张卡片，自上而下：

1. 标识：`github:owner/repo`
2. 事实行：作者 / 星标 / 许可 / **仅当有启发式结果时**才出现「提示」
3. 说明：剥掉 frontmatter、注释、徽章、图片、HTML、表格、安装/许可证标题后的 **摘要段落**（约 640 字、最多 6 块）
4. 「在仓库中阅读完整 README」
5. 操作：打开仓库 / 安装（先确认）

列表态只保留：名称、两行描述、已安装标记、星标。不再在折叠卡片上堆英文 `high`/`medium`。

公开站详情页同样改成段落摘要 + 仓库链接，而不是 `pre-wrap` 原文。卡片上「未评估」不再当标签刷屏（1125 条里绝大多数都是未评估）。

### 2.3 仍未做、也不该做的

设置 Tab **不会**上完整 Markdown 渲染器（GFM / mermaid / HTML）。那会把设置页变成文档站，且有 XSS 面。完整文档的正确位置是仓库。

Client 里的 `excerptReadme` 与 Host `src/utils/readme.ts` 是两份相近实现，存在漂移风险。Agent 工具走 Host 摘要（1200 字）。

---

## 3. 风险等级：逻辑是否合理

### 3.1 结论（先说清楚）

**旧逻辑不合理。** 字段名叫 `permissionLevel`，实际**不是**权限审计、不是静态分析、不是沙箱 profile。它只是对名称/描述/topics/keywords 做关键词匹配。

安装第三方插件 = 在本机执行其代码。真正的控制是：**默认不装、装前确认、走官方 `dsh plugin add`、文案写明「目录不是推荐」**。启发式最多做弱提示。

因此默认值必须是 **`unknown`（未评估）**，并且 UI 不能把「未评估」画成一种安全结论。

### 3.2 旧规则如何失效（全量 1125 条）

旧实现是 `String.includes` 子串匹配，先命中 `high` 即返回。典型误报：

| 词 | 误伤 |
|---|---|
| `git` | GitHub |
| `system` | design-systems |
| `auth` | author |
| `read` | readme |
| `web` / `ui` | 几乎所有 Web 主题 |
| `shell` | “desktop shell / WebView shell” |
| `exec` / `execute` / `eval` | “execute tasks”、`dsh-eval-regression` |
| `upload` / `download` | 图床、拖放、主题上传背景图 |

当时分布大约是：high 273 · medium 317 · low 93 · safe 3 · unknown 439。超过一半被标成中高风险，标签失去区分度；`safe` 几乎不可达。

### 3.3 现行规则

英文用**词边界**（`git` ≠ `github`）；中文仍用子串。

| 级别 | 何时 | 词表 |
|---|---|---|
| **high** | 任意字段 | `sudo` `password` `secret` `keylogger` `filesystem` |
| **high** | 仅名称 / topics / keywords | `bash` `ssh` `credential` `spawn` |
| **safe** | 仅名称 / topics / keywords | `theme` `skin` `sticker` `emoji` `cosmetic` |
| **medium** | 任意字段 | `scrape` `crawl`（当前目录 0 条） |
| **unknown** | 其余 | 默认 |

`shell` / `exec` / `eval` / `upload` 已删除：描述文案噪声大于信号。外观类放在 medium 之前，避免「主题 + 上传背景」被标成需注意。

`low` 仍留在类型里以兼容旧缓存，**生成路径不再写出**。

### 3.4 重打分结果（同一份 1125 条目录）

| 版本 | high | medium | safe | unknown |
|---|---:|---:|---:|---:|
| 子串 includes | 273 | 317 | 3 | 439（另有 low 93） |
| 词边界 + 宽词表 | 47 | 7 | 34 | 1037 |
| **现行（身份字段收紧）** | **18** | **0** | **29** | **1078** |

现行 high（18）大体可解释：bash/ssh 工具、凭据/密码、filesystem、安全扫描技能包、远程访问。safe（29）基本是皮肤/主题。

### 3.5 仍存在的误报 / 漏报（必须承认）

**误报（high 里仍有噪声）：**

- `dsh-repro`：描述写 `secret-scrubbed`（在洗敏感信息，不是在管密钥）
- `dsh-tool-monitor`：身份字段带 `bash`，实际是监视已有任务
- `deepseek-harness-lan`：topic 含 `bash`

**漏报（unknown，但能力并不「普通」）：**

- `dsh-plugin-interpreters`：名称是 `interpreters` 复数，匹配不到 `interpreter`；会跑 Python/Node
- 各类 Electron / Wails / WebView **桌面壳**：不再因 “shell” 报警，但它们确实有 OS 能力
- 只在中文描述里写「执行代码」、名称完全中性的插件

没有源码审计之前，漏报是常态。把漏报全部用更宽的词补回去，会回到「一半目录都是高风险」。

### 3.6 产品含义

| 该做 | 不该做 |
|---|---|
| 未评估不展示标签 | 把标签当成「已审计 / 安全」 |
| 高权限提示用克制文案 | 在每张卡片上重复长免责声明 |
| 安装确认 + 官方 CLI | 假装能从 README 推断权限集 |

公开站与 DSH Tab 现在都：**未评估不打标；外观类 / 高权限提示才出现。**

---

## 4. 其它自检项

### 4.1 通过

- Client 包名 id 为 `dsh-plugin-market`，`$mount` 后再嵌套 inject `remote.pluginMarket`
- `dsh.client.inject` 含 settings UI；入口为 `settings.plugins.tab`
- Remote 方法无默认参数 `= {}`（Gateway 解析 `Function.toString()`）
- 安装走 `dsh plugin add/remove`；Windows 下 `dsh`/`npx` 走 `.cmd`
- 目录失败可回落 snapshot；`fallbackToSearch` 仍可用
- README 上线截断（抓取 20k / Remote 12k / UI 摘要）
- `src/utils/classifier.ts` 与 `shared/classifier.mjs` 规则已对齐（**以后改一处必须改另一处**）
- 缓存 upsert 会覆盖 `permission_level`；同步新目录后旧 SQLite 分数会更新

### 4.2 未通过 / 已知债

| 项 | 说明 |
|---|---|
| 无单元测试 | 分类器、README 摘要、Remote 编解码都没有自动回归 |
| 双份 excerpt | Client JS 与 `src/utils/readme.ts` 会再漂移 |
| `src/ui/web-server.ts` | 旧独立面板仍在树里，默认关闭，和产品 UI 重复 |
| `src/shared/*` 与 `src/utils/*` | 分类/目录工具可能有历史重复路径 |
| npm 下载量 | 目录里多为 0 |
| 无更新检测 | 只能卸了再装 |
| 本机缓存 | 用户需「同步目录」或重启后才会吃到新的风险分数 |
| 分类 `other` | 约 40%+ 仍是 other，关键词分类同样是启发式 |

### 4.3 安全边界（安装路径）

- 市场**不执行**第三方 `install.sh`
- 确认框之后才调 CLI
- 目录是公开索引，**不构成推荐**
- 启发式**不能**替代你自己读仓库

XSS：设置 Tab 用 React 文本节点渲染摘要，不 `dangerouslySetInnerHTML`。旧 `web-server.ts` 若被手动打开，仍是 HTML 字符串拼接（有 `escapeHtml`）。

---

## 5. 使用侧回归清单

DSH 重启后：

1. 设置 → 插件 → 第三个 Tab「插件市场」
2. 折叠卡片：名称 + 描述 + 星标，没有英文 `high`
3. 展开主题类插件：提示为「外观类」；说明是短段落，不是徽章墙
4. 展开普通插件：没有风险行；有「在仓库中阅读完整 README」
5. 展开 `dsh-ssh` / `dsh-bash-encoding` 一类：出现「高权限提示」
6. 安装仍先确认，确认后 `dsh plugin list` 能看到

公开站：卡片不再刷「未评估」；详情页说明区是摘要。

---

## 6. 总结

- **UI**：设置面板按「列表 → 元数据 → 摘要 → 仓库」分层后，README 可读；完整文档不该塞进 Tab。
- **风险**：旧 5 级子串匹配**不合理**。现行默认未评估、少标、把身份字段和描述文案分开，分布才像提示而不是噪声。它仍然**不是审计**。
- **真正的安全模型**：确认安装 + 官方 CLI + 用户自己信任来源。启发式只是弱信号。
