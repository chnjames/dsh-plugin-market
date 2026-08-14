// ============================================================
// DSH Plugin Market - Standalone Web UI Server
// ============================================================
// 提供一个独立的 Web 面板，用户可以在浏览器中浏览和安装插件
// 也可以通过 DSH 的 artifact 能力嵌入到 DSH Web UI 中
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PluginCache } from '../db/cache.js';
import { IndexingService } from '../services/indexing.js';
import { InstallerService } from '../services/installer.js';
import type { PluginMarketConfig } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface WebServerOptions {
  port?: number;
  host?: string;
  config: PluginMarketConfig;
  cache: PluginCache;
  indexing: IndexingService;
  installer: InstallerService;
}

export class PluginMarketWebServer {
  private server: http.Server;
  private port: number;
  private host: string;
  private cache: PluginCache;
  private indexing: IndexingService;
  private installer: InstallerService;
  private config: PluginMarketConfig;

  constructor(options: WebServerOptions) {
    this.port = options.port || 3789;
    this.host = options.host || '127.0.0.1';
    this.cache = options.cache;
    this.indexing = options.indexing;
    this.installer = options.installer;
    this.config = options.config;

    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        console.info(`[plugin-market] Web UI running at http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
      // API 路由
      if (pathname.startsWith('/api/')) {
        await this.handleApi(pathname.slice('/api'.length), url, req, res);
        return;
      }

      // 静态文件
      if (pathname === '/' || pathname === '/index.html') {
        this.serveHtml(res);
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (error) {
      console.error('[plugin-market] Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private async handleApi(
    path: string,
    url: URL,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const sendJson = (data: any, statusCode: number = 200) => {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(data));
    };

    // GET /api/plugins - 搜索插件
    if (path === '/plugins' && req.method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const category = url.searchParams.get('category') || undefined;
      const sortBy = (url.searchParams.get('sortBy') as any) || 'stars';
      const sortOrder = (url.searchParams.get('sortOrder') as any) || 'desc';
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
      const installedOnly = url.searchParams.get('installedOnly') === 'true';

      const result = await this.indexing.search(query, {
        category,
        sortBy,
        sortOrder,
        page,
        pageSize,
        installedOnly,
      });

      sendJson(result);
      return;
    }

    // GET /api/plugins/:id - 插件详情
    const detailMatch = path.match(/^\/plugins\/(.+)$/);
    if (detailMatch && req.method === 'GET') {
      const pluginId = decodeURIComponent(detailMatch[1]);
      const detail = await this.indexing.getDetail(pluginId);
      if (!detail) {
        sendJson({ error: 'Plugin not found' }, 404);
      } else {
        sendJson(detail);
      }
      return;
    }

    // GET /api/categories - 分类列表
    if (path === '/categories' && req.method === 'GET') {
      const categories = await this.indexing.getCategories();
      sendJson(categories);
      return;
    }

    // GET /api/trending - 热门插件
    if (path === '/trending' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const plugins = await this.indexing.getTrending(limit);
      sendJson(plugins);
      return;
    }

    // GET /api/recent - 最新插件
    if (path === '/recent' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const plugins = await this.indexing.getRecent(limit);
      sendJson(plugins);
      return;
    }

    // GET /api/cache-status - 缓存状态
    if (path === '/cache-status' && req.method === 'GET') {
      const status = await this.indexing.getCacheStatus();
      sendJson(status);
      return;
    }

    // POST /api/sync - 手动同步
    if (path === '/sync' && req.method === 'POST') {
      const result = await this.indexing.syncAll();
      sendJson(result);
      return;
    }

    // GET /api/installed - 已安装插件
    if (path === '/installed' && req.method === 'GET') {
      const installed = await this.installer.getInstalled();
      sendJson(installed);
      return;
    }

    // POST /api/plugins/:id/install - 安装插件
    const installMatch = path.match(/^\/plugins\/(.+)\/install$/);
    if (installMatch && req.method === 'POST') {
      const pluginId = decodeURIComponent(installMatch[1]);
      const body = await this.parseBody(req);
      const result = await this.installer.install(pluginId, {
        profile: body?.profile,
      });
      sendJson(result, result.success ? 200 : 500);
      return;
    }

    // POST /api/plugins/:id/uninstall - 卸载插件
    const uninstallMatch = path.match(/^\/plugins\/(.+)\/uninstall$/);
    if (uninstallMatch && req.method === 'POST') {
      const pluginId = decodeURIComponent(uninstallMatch[1]);
      const body = await this.parseBody(req);
      const result = await this.installer.uninstall(pluginId, {
        profile: body?.profile,
      });
      sendJson(result, result.success ? 200 : 500);
      return;
    }

    // POST /api/plugins/:id/update - 更新插件
    const updateMatch = path.match(/^\/plugins\/(.+)\/update$/);
    if (updateMatch && req.method === 'POST') {
      const pluginId = decodeURIComponent(updateMatch[1]);
      const body = await this.parseBody(req);
      const result = await this.installer.update(pluginId, {
        profile: body?.profile,
      });
      sendJson(result, result.success ? 200 : 500);
      return;
    }

    sendJson({ error: 'Not found' }, 404);
  }

  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', reject);
    });
  }

  private serveHtml(res: http.ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(HTML_TEMPLATE);
  }
}

// ---------- HTML 模板 ----------

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DSH 插件市场</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      line-height: 1.5;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 24px 32px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header .subtitle {
      font-size: 13px;
      opacity: 0.7;
      margin-top: 4px;
    }
    .header .stats {
      display: flex;
      gap: 24px;
      margin-top: 12px;
      font-size: 13px;
    }
    .header .stats span {
      opacity: 0.8;
    }
    .header .stats strong {
      font-weight: 600;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 32px;
    }
    .toolbar {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      align-items: center;
    }
    .search-box {
      flex: 1;
      min-width: 300px;
      position: relative;
    }
    .search-box input {
      width: 100%;
      padding: 12px 16px 12px 44px;
      border: 1px solid #d2d2d7;
      border-radius: 10px;
      font-size: 15px;
      background: white;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-box input:focus {
      outline: none;
      border-color: #0071e3;
      box-shadow: 0 0 0 4px rgba(0,113,227,0.1);
    }
    .search-box::before {
      content: '🔍';
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
    }
    .filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 8px 16px;
      border: 1px solid #d2d2d7;
      border-radius: 20px;
      background: white;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .filter-btn:hover {
      background: #f5f5f7;
    }
    .filter-btn.active {
      background: #0071e3;
      color: white;
      border-color: #0071e3;
    }
    .sort-select {
      padding: 10px 14px;
      border: 1px solid #d2d2d7;
      border-radius: 10px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }
    .sync-btn {
      padding: 10px 18px;
      border: none;
      border-radius: 10px;
      background: #34c759;
      color: white;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .sync-btn:hover {
      background: #28a745;
    }
    .sync-btn:disabled {
      background: #999;
      cursor: not-allowed;
    }
    .category-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .category-tab {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: transparent;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      color: #6e6e73;
      transition: all 0.2s;
    }
    .category-tab:hover {
      background: #e8e8ed;
      color: #1d1d1f;
    }
    .category-tab.active {
      background: #e8e8ed;
      color: #1d1d1f;
      font-weight: 500;
    }
    .category-tab .count {
      margin-left: 6px;
      color: #86868b;
      font-size: 12px;
    }
    .plugin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .plugin-card {
      background: white;
      border-radius: 14px;
      padding: 20px;
      border: 1px solid #e8e8ed;
      transition: all 0.2s;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .plugin-card:hover {
      border-color: #d2d2d7;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      transform: translateY(-2px);
    }
    .plugin-card.installed {
      border-color: #34c759;
      background: linear-gradient(135deg, #f0fff4 0%, white 100%);
    }
    .plugin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .plugin-name {
      font-size: 16px;
      font-weight: 600;
      color: #1d1d1f;
    }
    .plugin-stars {
      font-size: 13px;
      color: #86868b;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .plugin-desc {
      font-size: 13px;
      color: #6e6e73;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }
    .plugin-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .plugin-tag {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      background: #f5f5f7;
      color: #6e6e73;
    }
    .plugin-tag.risk-high { background: #ffe5e5; color: #d70015; }
    .plugin-tag.risk-medium { background: #fff3cd; color: #856404; }
    .plugin-tag.risk-low { background: #d4edda; color: #155724; }
    .plugin-tag.risk-safe { background: #d1ecf1; color: #0c5460; }
    .plugin-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px solid #f0f0f2;
    }
    .plugin-author {
      font-size: 12px;
      color: #86868b;
    }
    .install-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .install-btn.install {
      background: #0071e3;
      color: white;
    }
    .install-btn.install:hover {
      background: #0077ed;
    }
    .install-btn.installed {
      background: #e8e8ed;
      color: #6e6e73;
      cursor: default;
    }
    .install-btn.installing {
      background: #ffcc00;
      color: #1d1d1f;
    }
    .install-btn.uninstall {
      background: #ff3b30;
      color: white;
    }
    .install-btn.uninstall:hover {
      background: #d70015;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #86868b;
    }
    .empty-state .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .empty-state h3 {
      font-size: 18px;
      margin-bottom: 8px;
      color: #1d1d1f;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #86868b;
    }
    .loading .spinner {
      display: inline-block;
      width: 32px;
      height: 32px;
      border: 3px solid #e8e8ed;
      border-top-color: #0071e3;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    /* 详情抽屉 */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s;
    }
    .drawer-overlay.open {
      opacity: 1;
      visibility: visible;
    }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 600px;
      max-width: 90vw;
      height: 100vh;
      background: white;
      z-index: 1001;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    .drawer.open {
      transform: translateX(0);
    }
    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e8e8ed;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .drawer-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #86868b;
      padding: 4px;
    }
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .drawer-footer {
      padding: 16px 24px;
      border-top: 1px solid #e8e8ed;
      display: flex;
      gap: 12px;
    }
    .detail-title {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .detail-desc {
      color: #6e6e73;
      margin-bottom: 20px;
    }
    .detail-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .detail-meta-item {
      background: #f5f5f7;
      padding: 12px;
      border-radius: 8px;
    }
    .detail-meta-label {
      font-size: 11px;
      color: #86868b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .detail-meta-value {
      font-size: 14px;
      font-weight: 500;
    }
    .detail-readme {
      background: #f5f5f7;
      padding: 16px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      max-height: 400px;
      overflow-y: auto;
    }
    .detail-readme h1, .detail-readme h2, .detail-readme h3 {
      margin: 16px 0 8px;
    }
    .detail-readme code {
      background: #e8e8ed;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .detail-readme pre {
      background: #1d1d1f;
      color: #f5f5f7;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 8px 0;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1d1d1f;
      color: white;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      z-index: 2000;
      opacity: 0;
      transition: all 0.3s;
    }
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .toast.success { background: #34c759; }
    .toast.error { background: #ff3b30; }
    .pagination {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
    }
    .page-btn {
      padding: 8px 14px;
      border: 1px solid #d2d2d7;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      font-size: 13px;
    }
    .page-btn:hover {
      background: #f5f5f7;
    }
    .page-btn.active {
      background: #0071e3;
      color: white;
      border-color: #0071e3;
    }
    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔌 DSH 插件市场</h1>
    <div class="subtitle">发现、安装和管理 DeepSeek Harness 社区插件</div>
    <div class="stats">
      <span>插件总数: <strong id="totalCount">--</strong></span>
      <span>已安装: <strong id="installedCount">--</strong></span>
      <span>最后同步: <strong id="lastSync">--</strong></span>
    </div>
  </div>

  <div class="container">
    <div class="toolbar">
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="搜索插件名称、描述、关键词..." />
      </div>
      <select class="sort-select" id="sortSelect">
        <option value="stars">按热度排序</option>
        <option value="updated">按更新时间排序</option>
        <option value="name">按名称排序</option>
      </select>
      <button class="sync-btn" id="syncBtn">🔄 同步</button>
    </div>

    <div class="category-tabs" id="categoryTabs"></div>

    <div id="pluginList">
      <div class="loading">
        <div class="spinner"></div>
        <div>加载中...</div>
      </div>
    </div>

    <div class="pagination" id="pagination"></div>
  </div>

  <!-- 详情抽屉 -->
  <div class="drawer-overlay" id="drawerOverlay"></div>
  <div class="drawer" id="drawer">
    <div class="drawer-header">
      <div>
        <div class="detail-title" id="detailName">--</div>
        <div class="detail-desc" id="detailDesc">--</div>
      </div>
      <button class="drawer-close" id="drawerClose">&times;</button>
    </div>
    <div class="drawer-body" id="drawerBody">
      <div class="loading">
        <div class="spinner"></div>
        <div>加载详情...</div>
      </div>
    </div>
    <div class="drawer-footer" id="drawerFooter" style="display:none;">
      <button class="install-btn install" id="detailInstallBtn" style="flex:1; padding: 12px; font-size: 14px;">安装</button>
      <a id="detailSourceLink" href="#" target="_blank" style="flex:1; padding: 12px; font-size: 14px; text-align: center; background: #e8e8ed; color: #1d1d1f; border-radius: 6px; text-decoration: none;">查看源码</a>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast"></div>

  <script>
    // ---------- 状态 ----------
    const state = {
      plugins: [],
      total: 0,
      categories: [],
      currentCategory: 'all',
      currentPage: 1,
      pageSize: 50,
      sortBy: 'stars',
      sortOrder: 'desc',
      searchQuery: '',
      currentDetail: null,
      installing: new Set(),
    };

    // ---------- API ----------
    const api = {
      async searchPlugins(query, options = {}) {
        const params = new URLSearchParams({
          q: query,
          page: options.page || 1,
          pageSize: options.pageSize || 50,
          sortBy: options.sortBy || 'stars',
          sortOrder: options.sortOrder || 'desc',
          ...(options.category && options.category !== 'all' ? { category: options.category } : {}),
        });
        const res = await fetch('/api/plugins?' + params);
        return res.json();
      },
      async getCategories() {
        const res = await fetch('/api/categories');
        return res.json();
      },
      async getCacheStatus() {
        const res = await fetch('/api/cache-status');
        return res.json();
      },
      async sync() {
        const res = await fetch('/api/sync', { method: 'POST' });
        return res.json();
      },
      async getDetail(id) {
        const res = await fetch('/api/plugins/' + encodeURIComponent(id));
        return res.json();
      },
      async install(id) {
        const res = await fetch('/api/plugins/' + encodeURIComponent(id) + '/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        return res.json();
      },
      async uninstall(id) {
        const res = await fetch('/api/plugins/' + encodeURIComponent(id) + '/uninstall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        return res.json();
      },
      async getInstalled() {
        const res = await fetch('/api/installed');
        return res.json();
      },
    };

    // ---------- 渲染 ----------
    function renderCategories() {
      const tabs = document.getElementById('categoryTabs');
      const allCount = state.total;
      let html = \`<button class="category-tab \${state.currentCategory === 'all' ? 'active' : ''}" data-cat="all">全部<span class="count">\${allCount}</span></button>\`;

      for (const cat of state.categories) {
        if (cat.pluginCount === 0) continue;
        html += \`<button class="category-tab \${state.currentCategory === cat.id ? 'active' : ''}" data-cat="\${cat.id}">\${cat.icon || '📦'} \${cat.name}<span class="count">\${cat.pluginCount}</span></button>\`;
      }

      tabs.innerHTML = html;

      tabs.querySelectorAll('.category-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.currentCategory = btn.dataset.cat;
          state.currentPage = 1;
          loadPlugins();
          renderCategories();
        });
      });
    }

    function renderPlugins() {
      const list = document.getElementById('pluginList');

      if (state.plugins.length === 0) {
        list.innerHTML = \`
          <div class="empty-state">
            <div class="icon">🔍</div>
            <h3>没有找到插件</h3>
            <p>试试其他关键词或分类</p>
          </div>
        \`;
        return;
      }

      let html = '<div class="plugin-grid">';
      for (const plugin of state.plugins) {
        const isInstalling = state.installing.has(plugin.id);
        const riskClass = 'risk-' + plugin.permissionLevel;
        const riskLabel = {
          safe: '安全',
          low: '低风险',
          medium: '中风险',
          high: '高风险',
          unknown: '未知',
        }[plugin.permissionLevel] || '未知';

        html += \`
          <div class="plugin-card \${plugin.isInstalled ? 'installed' : ''}" data-id="\${plugin.id}">
            <div class="plugin-header">
              <div class="plugin-name">\${escapeHtml(plugin.name)}</div>
              <div class="plugin-stars">⭐ \${plugin.stars}</div>
            </div>
            <div class="plugin-desc">\${escapeHtml(plugin.description || '暂无描述')}</div>
            <div class="plugin-meta">
              <span class="plugin-tag">\${getCategoryName(plugin.category)}</span>
              <span class="plugin-tag \${riskClass}">\${riskLabel}</span>
              <span class="plugin-tag">\${plugin.source === 'github' ? 'GitHub' : 'npm'}</span>
            </div>
            <div class="plugin-footer">
              <span class="plugin-author">👤 \${escapeHtml(plugin.author || '未知')}</span>
              <button class="install-btn \${isInstalling ? 'installing' : plugin.isInstalled ? 'installed' : 'install'}"
                      data-action="\${plugin.isInstalled ? 'uninstall' : 'install'}"
                      data-id="\${plugin.id}"
                      \${isInstalling ? 'disabled' : ''}>
                \${isInstalling ? '安装中...' : plugin.isInstalled ? '✓ 已安装' : '安装'}
              </button>
            </div>
          </div>
        \`;
      }
      html += '</div>';
      list.innerHTML = html;

      // 绑定卡片点击
      list.querySelectorAll('.plugin-card').forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.install-btn')) return;
          openDetail(card.dataset.id);
        });
      });

      // 绑定安装按钮
      list.querySelectorAll('.install-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          if (action === 'install') {
            await handleInstall(id);
          } else {
            await handleUninstall(id);
          }
        });
      });
    }

    function renderPagination() {
      const pagination = document.getElementById('pagination');
      const totalPages = Math.ceil(state.total / state.pageSize);

      if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
      }

      let html = '';
      html += \`<button class="page-btn" \${state.currentPage === 1 ? 'disabled' : ''} data-page="prev">上一页</button>\`;

      const maxVisible = 7;
      let start = Math.max(1, state.currentPage - 3);
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        html += \`<button class="page-btn \${i === state.currentPage ? 'active' : ''}" data-page="\${i}">\${i}</button>\`;
      }

      html += \`<button class="page-btn" \${state.currentPage === totalPages ? 'disabled' : ''} data-page="next">下一页</button>\`;
      pagination.innerHTML = html;

      pagination.querySelectorAll('.page-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const page = btn.dataset.page;
          if (page === 'prev') state.currentPage = Math.max(1, state.currentPage - 1);
          else if (page === 'next') state.currentPage = Math.min(totalPages, state.currentPage + 1);
          else state.currentPage = parseInt(page, 10);
          loadPlugins();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }

    function renderStats(status) {
      document.getElementById('totalCount').textContent = status.totalPlugins;
      document.getElementById('lastSync').textContent = status.lastSyncAt
        ? formatTime(status.lastSyncAt)
        : '从未同步';
    }

    // ---------- 操作 ----------
    async function loadPlugins() {
      const list = document.getElementById('pluginList');
      list.innerHTML = '<div class="loading"><div class="spinner"></div><div>加载中...</div></div>';

      try {
        const result = await api.searchPlugins(state.searchQuery, {
          category: state.currentCategory,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          page: state.currentPage,
          pageSize: state.pageSize,
        });
        state.plugins = result.plugins;
        state.total = result.total;
        renderPlugins();
        renderPagination();
        renderCategories();
      } catch (error) {
        list.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>加载失败</h3><p>' + error.message + '</p></div>';
      }
    }

    async function loadCategories() {
      try {
        state.categories = await api.getCategories();
        renderCategories();
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    }

    async function loadStatus() {
      try {
        const status = await api.getCacheStatus();
        renderStats(status);
        if (status.totalPlugins === 0 || status.isStale) {
          showToast('正在同步插件数据...', '');
          await api.sync();
          await loadPlugins();
          await loadStatus();
          showToast('同步完成', 'success');
        }
      } catch (error) {
        console.error('Failed to load status:', error);
      }
    }

    async function handleInstall(pluginId) {
      state.installing.add(pluginId);
      renderPlugins();

      try {
        const result = await api.install(pluginId);
        if (result.success) {
          showToast('安装成功', 'success');
          await loadPlugins();
        } else {
          showToast('安装失败: ' + (result.error || '未知错误'), 'error');
        }
      } catch (error) {
        showToast('安装失败: ' + error.message, 'error');
      } finally {
        state.installing.delete(pluginId);
        renderPlugins();
      }
    }

    async function handleUninstall(pluginId) {
      if (!confirm('确定要卸载这个插件吗？')) return;

      state.installing.add(pluginId);
      renderPlugins();

      try {
        const result = await api.uninstall(pluginId);
        if (result.success) {
          showToast('卸载成功', 'success');
          await loadPlugins();
        } else {
          showToast('卸载失败: ' + (result.error || '未知错误'), 'error');
        }
      } catch (error) {
        showToast('卸载失败: ' + error.message, 'error');
      } finally {
        state.installing.delete(pluginId);
        renderPlugins();
      }
    }

    async function openDetail(pluginId) {
      const drawer = document.getElementById('drawer');
      const overlay = document.getElementById('drawerOverlay');
      const body = document.getElementById('drawerBody');
      const footer = document.getElementById('drawerFooter');

      drawer.classList.add('open');
      overlay.classList.add('open');
      body.innerHTML = '<div class="loading"><div class="spinner"></div><div>加载详情...</div></div>';
      footer.style.display = 'none';

      try {
        const detail = await api.getDetail(pluginId);
        state.currentDetail = detail;

        document.getElementById('detailName').textContent = detail.name;
        document.getElementById('detailDesc').textContent = detail.description || '暂无描述';

        const riskLabel = {
          safe: '安全',
          low: '低风险',
          medium: '中风险',
          high: '高风险',
          unknown: '未知',
        }[detail.permissionLevel] || '未知';

        let html = '<div class="detail-meta">';
        html += '<div class="detail-meta-item"><div class="detail-meta-label">作者</div><div class="detail-meta-value">' + escapeHtml(detail.author || '未知') + '</div></div>';
        html += '<div class="detail-meta-item"><div class="detail-meta-label">版本</div><div class="detail-meta-value">' + escapeHtml(detail.version || '-') + '</div></div>';
        html += '<div class="detail-meta-item"><div class="detail-meta-label">许可证</div><div class="detail-meta-value">' + escapeHtml(detail.license || '-') + '</div></div>';
        html += '<div class="detail-meta-item"><div class="detail-meta-label">Stars</div><div class="detail-meta-value">⭐ ' + detail.stars + '</div></div>';
        html += '<div class="detail-meta-item"><div class="detail-meta-label">分类</div><div class="detail-meta-value">' + getCategoryName(detail.category) + '</div></div>';
        html += '<div class="detail-meta-item"><div class="detail-meta-label">风险级别</div><div class="detail-meta-value">' + riskLabel + '</div></div>';
        html += '</div>';

        if (detail.readme) {
          html += '<h3 style="margin-bottom:12px;">README</h3>';
          html += '<div class="detail-readme">' + formatReadme(detail.readme) + '</div>';
        }

        body.innerHTML = html;

        // 底部按钮
        footer.style.display = 'flex';
        const installBtn = document.getElementById('detailInstallBtn');
        const isInstalled = detail.isInstalled;
        installBtn.textContent = isInstalled ? '卸载' : '安装';
        installBtn.className = 'install-btn ' + (isInstalled ? 'uninstall' : 'install');
        installBtn.style.flex = '1';
        installBtn.style.padding = '12px';
        installBtn.style.fontSize = '14px';
        installBtn.onclick = async () => {
          if (isInstalled) {
            await handleUninstall(pluginId);
            closeDetail();
          } else {
            await handleInstall(pluginId);
            closeDetail();
          }
        };

        const sourceLink = document.getElementById('detailSourceLink');
        sourceLink.href = detail.url || '#';
      } catch (error) {
        body.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>加载失败</h3><p>' + error.message + '</p></div>';
      }
    }

    function closeDetail() {
      document.getElementById('drawer').classList.remove('open');
      document.getElementById('drawerOverlay').classList.remove('open');
      state.currentDetail = null;
    }

    // ---------- 工具函数 ----------
    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function formatTime(isoString) {
      const date = new Date(isoString);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return '刚刚';
      if (minutes < 60) return minutes + ' 分钟前';
      if (hours < 24) return hours + ' 小时前';
      if (days < 7) return days + ' 天前';
      return date.toLocaleDateString('zh-CN');
    }

    function getCategoryName(categoryId) {
      const cat = state.categories.find((c) => c.id === categoryId);
      return cat ? cat.name : categoryId;
    }

    function formatReadme(readme) {
      // 简单的 Markdown 转 HTML（只处理最基本的）
      let html = escapeHtml(readme);
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
      html = html.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre>$1</pre>');
      html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      html = html.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      html = html.replace(/\\n/g, '<br>');
      return html;
    }

    function showToast(message, type = '') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast show ' + type;
      setTimeout(() => {
        toast.className = 'toast ' + type;
      }, 3000);
    }

    // ---------- 事件绑定 ----------
    document.getElementById('searchInput').addEventListener('input', debounce((e) => {
      state.searchQuery = e.target.value;
      state.currentPage = 1;
      loadPlugins();
    }, 300));

    document.getElementById('sortSelect').addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      state.currentPage = 1;
      loadPlugins();
    });

    document.getElementById('syncBtn').addEventListener('click', async () => {
      const btn = document.getElementById('syncBtn');
      btn.disabled = true;
      btn.textContent = '同步中...';
      try {
        await api.sync();
        await loadPlugins();
        await loadStatus();
        showToast('同步完成', 'success');
      } catch (error) {
        showToast('同步失败: ' + error.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🔄 同步';
      }
    });

    document.getElementById('drawerClose').addEventListener('click', closeDetail);
    document.getElementById('drawerOverlay').addEventListener('click', closeDetail);

    function debounce(fn, delay) {
      let timer;
      return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }

    // ---------- 初始化 ----------
    async function init() {
      await loadCategories();
      await loadStatus();
      await loadPlugins();
    }

    init();
  </script>
</body>
</html>`;
