# DSH 插件市场 · 公开站

面向所有人的目录站（Next.js 静态导出），部署到 Vercel。  
数据来自 `public/registry.json`（仓库根目录 `npm run build:registry` / GitHub Actions 生成）。

本站只负责**浏览与复制安装命令**；真正安装在本机 DSH「设置 → 插件 → 插件市场」完成。产品总览与插件安装见仓库根 [README.md](../README.md)。

设计系统：[design.md](./design.md)（Ecosystem Index、⌘K、浅色默认 / 可切换暗色、中英、Harness 同源终端卡）。

## 能力

- 首页：安装命令终端、热门 / 分类 / 最近更新  
- 分类：排序与分页（`?sort=` / `?page=`）  
- 详情：复制安装命令、README 摘要  
- 顶栏：搜索 pill、⌘K / Ctrl+K、中文⇄EN、亮暗主题（localStorage；`?lang=en` 可深链）

## 本地

```bash
cd website
npm install
npm run dev
```

打开 http://localhost:3000 。

## Vercel

1. Import 本 GitHub 仓库  
2. Root Directory 设为 `website`  
3. Build Command: `npm run build`  
4. Output：Next.js 自动识别（`output: 'export'` → `out/`）  

`vercel.json` 已为 `/registry.json` 打开 CORS，供本机 DSH 插件拉取目录。
