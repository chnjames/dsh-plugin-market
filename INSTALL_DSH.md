# dsh-plugin-market — 分发安装与使用指南

> 版本：v0.3.0  
> 适用：DeepSeek Harness（web profile，Windows / macOS / Linux）

## 安装

```bash
dsh plugin --profile web add github:chnjames/dsh-plugin-market
```

npx 用户把 `dsh` 换成 `npx @deepseek-ai/dsh`。

安装后**重启 DSH**，打开 Web UI，进入 **设置 → 插件 → 插件市场**。

在该 Tab 里：

- 搜索、分类筛选
- 单列卡片查看简介；底栏「查看仓库」「安装」
- 点标题展开 README 摘要与仓库 id
- 安装 / 卸载前会二次确认（走官方 `dsh plugin` CLI）

独立调试面板（`ui.webPort`）默认关闭。需要时设为 `3789`。

## 公开网站

浏览目录、复制安装命令：部署 [`website/`](website/) 到 Vercel（Root Directory = `website`）。  
插件运行时会拉取该站的 `/registry.json`。

## 手动挂载

若 `dsh plugin add` 未自动写入 patch，把仓库里的 `cordis.yml` 追加到：

`<DSH_HOME>/profiles/web/cordis.patch.yml`

## 一键安装失败

- Windows：插件会调用 `dsh.cmd` / `npx.cmd`
- npx 用户在配置里设 `install.dshCommand: "npx @deepseek-ai/dsh"`
- 用 `dsh plugin --profile web list` 核对 profile 名称

## 卸载

```bash
dsh plugin --profile web remove dsh-plugin-market
```

本地缓存：`<DSH_HOME>/plugin-market.db`，删掉后下次启动会重新拉目录。
