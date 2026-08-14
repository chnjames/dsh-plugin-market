# DSH 插件市场 · 安装测试指南

> 版本：v0.3.0
> 最后更新：2026-08-14

## 前置

- Node.js 22+
- 能运行 `dsh web` 或 `npx @deepseek-ai/dsh web`
- 本插件已 `dsh plugin --profile web add …` 并**重启 DSH**

## 测试清单

### DSH 内嵌入口

- [ ] 设置 → 插件 出现第三个 Tab「插件市场」（在「插件配置」「插件列表」之后）
- [ ] 侧栏底部不再出现单独的「插件市场」按钮
- [ ] Tab 为单列卡片：名称、描述、「打开仓库 / 安装」默认可见；点标题展开说明
- [ ] 列表来自 catalog（DevTools Network 应看到 `registry.json`，而不是 GitHub Search）
- [ ] 搜索、分类 chips 可用
- [ ] 展开卡片：作者 / 星标 / 许可；说明区是摘要段落而不是原始 Markdown；完整 README 链到仓库
- [ ] 大多数卡片不显示风险标签；仅主题类显示「外观类」，明确高权限关键词才显示「高权限提示」
- [ ] 安装会先确认，确认后 `dsh plugin list` 能看到新插件
- [ ] 卸载同样生效
- [ ] 「同步目录」会重新拉 registry

### 独立站

- [ ] `cd website && npm run build` 成功
- [ ] 首页显示统计、分类、热门、搜索
- [ ] 分类页、详情页可打开
- [ ] 复制安装命令可用
- [ ] `/registry.json` 带 CORS 头（部署后）

### Agent 工具

- [ ] 「帮我搜视觉相关插件」走到 `plugin_market_search`
- [ ] 「我装了哪些插件」走到 `plugin_market_list_installed`

## 常见问题

| 现象 | 处理 |
|---|---|
| 设置里没有「插件市场」Tab | 确认 `package.json` 的 `dsh.client.immediately`；重启 DSH；检查 client 是否在 `lib/client.js` |
| 列表为空 | 等同步；或运行 `npm run build:registry` 后把 `website/public/registry.json` 提交；配置 `catalog.urls` |
| 安装失败 | Windows 确认 `dsh.cmd`；npx 用户配置 `dshCommand` |
| localhost:3789 打不开 | 这是预期：默认 `webPort: 0`。产品入口是 设置 → 插件 → 插件市场 |
