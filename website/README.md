# DSH 插件市场网站

面向所有人的公开目录站（Next.js 静态导出），部署到 Vercel。  
数据来自 `public/registry.json`（仓库根目录 `npm run build:registry` / GitHub Actions 生成）。

本站只负责**浏览与复制安装命令**；真正安装在本机 DSH「设置 → 插件 → 插件市场」完成。

## 本地

```bash
cd website
npm install
npm run dev
```

## Vercel

1. Import 本 GitHub 仓库
2. Root Directory 设为 `website`
3. Build Command: `npm run build`
4. Output: Next.js 自动识别（`output: 'export'` 产出 `out/`）

`vercel.json` 已为 `/registry.json` 打开 CORS，供本机 DSH 插件拉取目录。
