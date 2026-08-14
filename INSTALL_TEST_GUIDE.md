# DSH 插件市场 · 安装测试指南

> 版本：v0.1.4
> 适用系统：Windows / macOS / Linux
> 最后更新：2026-08-14

---

## 一、前置条件检查

### 1.1 Node.js

**要求：Node.js 22.19.0 或更高版本**

```bash
node --version
```

### 1.2 确认你的 DSH 运行方式

你使用的是 **npx 方式**运行 DSH：`npx @deepseek-ai/dsh web`

验证一下：
```bash
# 这个应该能正常输出版本号
npx @deepseek-ai/dsh --version
```

> ⚠️ 注意：本指南所有 `dsh plugin ...` 命令，你都需要替换为 `npx @deepseek-ai/dsh plugin ...`

### 1.3 Python / C++ 编译工具（不需要！）

本插件使用 **sql.js**（纯 JavaScript 实现的 SQLite），**不需要**安装 Python、Visual Studio Build Tools 或任何 C++ 编译环境。零原生依赖。

---

## 二、完整安装步骤（npx 用户版）

### 步骤 1：下载并解压插件包

1. 下载 `dsh-plugin-market-v0.1.4.zip`
2. 解压到一个固定目录，比如：
   - **Windows**: `C:\Users\你的用户名\dsh-plugins\dsh-plugin-market`
   - **macOS/Linux**: `~/dsh-plugins/dsh-plugin-market`

> ⚠️ 路径中不要有中文和空格

### 步骤 2：安装依赖并构建

打开终端，进入插件目录：

```bash
cd /path/to/dsh-plugin-market

# 安装依赖
npm install

# 构建 TypeScript
npm run build
```

**成功标志：**
- 生成了 `node_modules/` 目录
- `npm run build` 后生成了 `lib/` 目录
- 没有红色 error 输出

### 步骤 3：安装到 DSH

使用本地路径安装（推荐测试用）：

```bash
# Windows PowerShell 示例（注意路径用正斜杠或双反斜杠）
npx @deepseek-ai/dsh plugin --profile web add C:\Users\你的用户名\dsh-plugins\dsh-plugin-market

# macOS/Linux 示例
npx @deepseek-ai/dsh plugin --profile web add ~/dsh-plugins/dsh-plugin-market
```

### 步骤 4：验证安装

```bash
npx @deepseek-ai/dsh plugin --profile web list
```

如果能看到 `plugin.market` 或 `dsh-plugin-market`，说明安装成功。

### 步骤 5：配置 npx 命令（重要！）

因为你用 npx 运行 DSH，插件市场内部的「一键安装」按钮需要知道 dsh 命令的位置。

**找到 DSH 配置目录：**

DSH 的配置文件在 `~/.dsh` 目录下（Windows 是 `C:\Users\你的用户名\.dsh`）。

找到 `web` profile 的 `cordis.patch.yml` 文件（如果没有就新建），添加以下内容：

```yaml
- id: plugin.market
  config:
    install:
      dshCommand: "npx @deepseek-ai/dsh"
```

> 💡 也可以不配置，插件会自动检测（先试全局 dsh，找不到就用 npx）。但显式配置更稳定，避免每次启动都检测。

### 步骤 6：启动 DSH 并访问插件市场

1. 正常启动 DSH：`npx @deepseek-ai/dsh web`
2. 启动后等 10-30 秒（插件市场会后台同步数据）
3. 打开浏览器访问：**http://localhost:3789**

你应该能看到插件市场的界面，显示加载中，然后逐步显示插件列表。

---

## 三、功能测试清单

按以下顺序测试每个功能：

### ✅ 测试 1：页面加载

- [ ] 访问 http://localhost:3789 能打开页面
- [ ] 页面顶部显示统计信息（插件总数、已安装数、最后同步时间）
- [ ] 分类 Tab 正常显示
- [ ] 插件卡片网格正常渲染

### ✅ 测试 2：搜索功能

- [ ] 在搜索框输入关键词（如 "ui"、"vision"、"mcp"）
- [ ] 搜索结果实时更新
- [ ] 清空搜索框后恢复全部列表

### ✅ 测试 3：分类筛选

- [ ] 点击不同分类 Tab
- [ ] 插件列表按分类过滤
- [ ] 分类右侧的数量统计正确
- [ ] 点击"全部"回到全量列表

### ✅ 测试 4：排序功能

- [ ] 切换排序方式（热度/更新时间/名称）
- [ ] 插件列表顺序变化正确

### ✅ 测试 5：插件详情

- [ ] 点击任意插件卡片，右侧滑出详情抽屉
- [ ] 显示插件名称、描述、作者、版本、许可证等信息
- [ ] README 内容正常显示
- [ ] 点击"查看源码"能跳转到 GitHub/npm
- [ ] 点击关闭按钮或遮罩层，抽屉关闭

### ✅ 测试 6：手动同步

- [ ] 点击右上角"同步"按钮
- [ ] 按钮变为"同步中..."状态
- [ ] 同步完成后弹出成功提示
- [ ] 插件数量可能有更新

### ✅ 测试 7：安装插件（重要！）

> ⚠️ 建议先安装一个你熟悉的、确认安全的插件来测试

1. [ ] 找到一个想安装的插件
2. [ ] 点击卡片右下角的"安装"按钮
3. [ ] 按钮变为"安装中..."状态
4. [ ] 等待几秒到几十秒（npx 第一次会慢一点，因为要下载包）
5. [ ] 安装成功后，按钮变为"✓ 已安装"
6. [ ] 卡片边框变绿
7. [ ] 用 `npx @deepseek-ai/dsh plugin --profile web list` 确认插件已安装

**如果安装失败：**
- 检查是否配置了 `dshCommand: "npx @deepseek-ai/dsh"`
- 看看 DSH 控制台的日志输出
- 手动执行安装命令试试：`npx @deepseek-ai/dsh plugin --profile web add github:owner/repo`

### ✅ 测试 8：卸载插件

1. [ ] 点击已安装插件的"已安装"按钮
2. [ ] 弹出确认对话框
3. [ ] 确认后执行卸载
4. [ ] 卸载成功后按钮恢复为"安装"
5. [ ] 用 `npx @deepseek-ai/dsh plugin --profile web list` 确认插件已移除

### ✅ 测试 9：Agent 工具（可选）

在 DSH 对话中测试：

- [ ] 说"帮我搜索和视觉相关的插件"，Agent 能调用 `plugin_market_search` 工具
- [ ] 说"我装了哪些插件"，Agent 能调用 `plugin_market_list_installed` 工具
- [ ] 说"查看 xxx 插件的详情"，Agent 能调用 `plugin_market_detail` 工具

---

## 四、配置自定义（可选）

完整的配置项，在 `cordis.patch.yml` 中修改：

```yaml
- id: plugin.market
  name: plugin-market
  path: dsh-plugin-market
  config:
    sources:
      github:
        enabled: true
        topic: "dsh-plugin"
        token: "ghp_xxxxxxxxxxxx"   # 可选：GitHub Token，提高 API 速率限制
      npm:
        enabled: true
        keyword: "dsh-plugin"
        registry: "https://registry.npmmirror.com"  # 国内可以用淘宝源

    cache:
      ttl: 21600           # 缓存过期时间（秒），默认 6 小时
      autoRefresh: true    # 自动刷新
      refreshInterval: 21600

    ui:
      defaultSort: "stars"
      webPort: 3789        # 改端口号

    install:
      defaultProfile: "web"
      dshCommand: "npx @deepseek-ai/dsh"   # ⭐ npx 用户必须配置这个！
      confirmBeforeInstall: true
```

改完配置后重启 DSH 生效。

---

## 五、常见问题排查

### Q1：访问 http://localhost:3789 打不开

**可能原因：**
- 插件没启动成功
- 端口被占用
- 防火墙拦截

**排查步骤：**
```bash
# 1. 检查端口是否在监听（Windows）
netstat -ano | findstr "3789"

# 1. macOS/Linux
lsof -i :3789

# 2. 看看 DSH 启动日志里有没有 [plugin-market] 相关的报错
# 3. 试试换个端口（在配置里改 webPort）
```

### Q2：插件列表是空的，显示 0 个插件

**可能原因：**
- GitHub API 速率限制（未认证只有 10 次/分钟）
- 网络问题，连不上 GitHub 或 npm
- 同步还在进行中

**排查步骤：**
1. 等 1-2 分钟，点击"同步"按钮手动触发
2. 打开浏览器开发者工具（F12），看 Console 和 Network 有没有报错
3. 如果是速率限制，配置 GitHub Token（见上方配置说明）
4. 如果是网络问题，配置 npm 镜像源

### Q3：点击安装按钮没反应 / 安装失败

**这是 npx 用户最常见的问题！**

**可能原因：**
- 没有配置 `dshCommand`，自动检测也失败了
- profile 名称不对
- 网络问题

**排查步骤：**
```bash
# 1. 确认 npx dsh 可用
npx @deepseek-ai/dsh --version

# 2. 手动执行安装命令，看具体报错
npx @deepseek-ai/dsh plugin --profile web add github:owner/repo

# 3. 确认你的 DSH profile 名称
npx @deepseek-ai/dsh plugin list
```

**最可能的解决方法：**
在 `cordis.patch.yml` 中显式配置：
```yaml
- id: plugin.market
  config:
    install:
      dshCommand: "npx @deepseek-ai/dsh"
```

### Q4：TypeScript 编译失败

```bash
# 删掉重装
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### Q5：如何卸载插件市场

```bash
npx @deepseek-ai/dsh plugin --profile web remove plugin.market
# 或者
npx @deepseek-ai/dsh plugin --profile web remove dsh-plugin-market
```

---

## 六、日志与调试

### 查看插件日志

插件市场的日志会输出到 DSH 的标准输出中，前缀为 `[plugin-market]`。

关键日志标记：
- `Plugin market service starting...` — 服务开始启动
- `Database initialized` — 数据库初始化完成
- `Starting background sync...` — 开始后台同步
- `Sync complete: X plugins` — 同步完成
- `Web UI server started on port 3789` — Web 服务启动成功
- `Failed` / `Error` — 出错了

### npx 模式下的特殊日志

如果启用了自动检测，你会看到：
- 检测成功会用检测到的命令
- 检测失败会在安装时报错提示

---

## 七、数据存储位置

插件数据缓存在本地 SQLite 数据库中：

- **Windows**: `C:\Users\你的用户名\.dsh\plugin-market.db`
- **macOS/Linux**: `~/.dsh/plugin-market.db`

DSH 配置文件位置：
- **Windows**: `C:\Users\你的用户名\.dsh\`
- **macOS/Linux**: `~/.dsh/`

如果想完全重置插件市场，删掉 `plugin-market.db` 文件重启 DSH 即可。

---

## 八、测试反馈

测试时如果遇到问题，请记录：

1. **操作系统** 和版本（Win10 / Win11 / macOS / Linux）
2. **Node.js 版本**（`node --version`）
3. **DSH 版本**（`npx @deepseek-ai/dsh --version`）
4. **运行方式**（全局安装 / npx）
5. **问题描述**（具体哪个功能、什么现象）
6. **报错截图或日志**（完整的错误信息）
7. **复现步骤**（怎么操作能复现这个问题）
