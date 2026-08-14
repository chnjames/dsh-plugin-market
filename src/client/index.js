// ============================================================
// DSH Plugin Market - Browser Client Half
// Loaded via exports["./client"] + dsh.client { immediately: true }.
// Slot: settings.plugins.tab (Settings → Plugins → Plugin Market)
// Remote: $mount contribution, then nested inject of remote.pluginMarket.
// Builtin React: createElement / hooks only. No ctx.remote in components.
// ============================================================

window.__ModuleLoader__.load({
  id: 'dsh-plugin-market',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const React = require('react');
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useId = React.useId;

    const NS = 'settings.pluginMarket';
    const ZH = {
      tab: '插件市场',
      catalog: '插件市场',
      search: '搜索插件',
      loading: '正在读取插件目录…',
      error: '暂时无法读取插件目录。',
      retry: '重试',
      empty: '目录为空。',
      emptySearch: '没有匹配的插件。',
      installed: '已安装',
      install: '安装',
      uninstall: '卸载',
      sync: '同步目录',
      all: '全部',
      confirmInstall: '确认安装',
      confirmUninstall: '确认卸载',
      confirmHint: '将调用官方 dsh plugin CLI。只安装你信任的仓库。',
      cancel: '取消',
      stars: 'Stars',
      risk: '提示',
      license: '许可',
      author: '作者',
      version: '版本',
      source: '来源',
      openRepo: '查看仓库',
      noReadme: '暂无可读的说明。',
      needsConfirm: '请确认后再安装',
      synced: '已同步',
      about: '说明',
      readMore: '在仓库中阅读完整 README',
      starsLabel: '星标',
      riskUnknown: '未评估',
      riskSafe: '外观类',
      riskLow: '较低',
      riskMedium: '需注意',
      riskHigh: '高权限提示',
      riskHint: '来自公开文案的关键词提示，不是安全审计。',
      disclaimer: '目录来自公开 GitHub / npm 索引，不构成推荐。',
    };
    const EN = {
      tab: 'Plugin market',
      catalog: 'Plugin market',
      search: 'Search plugins',
      loading: 'Reading the plugin catalog…',
      error: 'The plugin catalog is temporarily unavailable.',
      retry: 'Retry',
      empty: 'The catalog is empty.',
      emptySearch: 'No matching plugins.',
      installed: 'Installed',
      install: 'Install',
      uninstall: 'Uninstall',
      sync: 'Sync catalog',
      all: 'All',
      confirmInstall: 'Confirm install',
      confirmUninstall: 'Confirm uninstall',
      confirmHint: 'Runs the official dsh plugin CLI. Only install repos you trust.',
      cancel: 'Cancel',
      stars: 'Stars',
      risk: 'Hint',
      license: 'License',
      author: 'Author',
      version: 'Version',
      source: 'Source',
      openRepo: 'View repo',
      noReadme: 'No readable description.',
      needsConfirm: 'Confirm before installing',
      synced: 'Synced',
      about: 'About',
      readMore: 'Read the full README in the repository',
      starsLabel: 'Stars',
      riskUnknown: 'Not assessed',
      riskSafe: 'Cosmetic',
      riskLow: 'Lower',
      riskMedium: 'Caution',
      riskHigh: 'Elevated access',
      riskHint: 'Keyword hint from public text, not a security audit.',
      disclaimer: 'Catalog is a public GitHub/npm index, not an endorsement.',
    };

    const CSS = [
      '.pmk_section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}',
      '.pmk_status,.pmk_failure p,.pmk_heading h3,.pmk_disclaimer{margin:0}',
      '.pmk_status,.pmk_disclaimer{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
      '.pmk_disclaimer{font-size:12px;line-height:18px}',
      '.pmk_failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;display:flex}',
      '.pmk_failure p{margin:0}',
      '.pmk_catalog{flex-direction:column;gap:12px;display:flex}',
      '.pmk_search{width:100%;color:var(--dsw-alias-label-tertiary);align-items:center;display:flex;position:relative}',
      '.pmk_search>svg{pointer-events:none;position:absolute;left:12px}',
      '.pmk_search input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:36px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;outline:none;padding:0 34px 0 36px;font-size:13px}',
      '.pmk_search input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.pmk_search input:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent)}',
      '.pmk_chips{display:flex;flex-wrap:wrap;gap:6px}',
      '.pmk_chip{font:inherit;font-size:11px;line-height:16px;cursor:pointer;border:0;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:5px;padding:1px 6px;min-height:20px}',
      '.pmk_chip[data-on="true"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 16%,transparent);color:var(--dsw-alias-state-business-primary)}',
      '.pmk_heading{align-items:baseline;gap:7px;padding:0 2px;display:flex}',
      '.pmk_heading h3{font-size:13px;font-weight:600;line-height:20px}',
      '.pmk_heading span{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}',
      '.pmk_toolbar{margin-left:auto;display:flex;align-items:center;gap:8px}',
      '.pmk_msg{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.pmk_cards{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}',
      '.pmk_card{box-sizing:border-box;display:flex;flex-direction:column;gap:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;min-width:0;overflow:hidden}',
      '.pmk_card:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pmk_card[data-open="true"]{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-3)}',
      '.pmk_card[data-installed="true"]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,var(--dsw-alias-border-l2))}',
      '.pmk_head{box-sizing:border-box;width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:transparent;border:0;display:flex;flex-direction:column;align-items:stretch;gap:6px;padding:12px 14px 8px}',
      '.pmk_head:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}',
      '.pmk_titleRow{display:flex;align-items:center;gap:8px;min-width:0}',
      '.pmk_title{text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1;font-size:14px;font-weight:600;line-height:20px;overflow:hidden}',
      '.pmk_meta{display:flex;align-items:center;gap:8px;flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px}',
      '.pmk_stars{font-variant-numeric:tabular-nums}',
      '.pmk_chevron{flex:none}',
      '.pmk_card[data-open="true"] .pmk_chevron{transform:rotate(180deg)}',
      '.pmk_desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;min-height:18px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.pmk_foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 14px 12px;min-width:0}',
      '.pmk_facts{display:flex;flex-wrap:wrap;align-items:center;gap:0;margin:0;padding:0;list-style:none;min-width:0;flex:1}',
      '.pmk_facts li{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.pmk_facts li+li::before{content:"·";margin:0 6px;color:var(--dsw-alias-label-tertiary)}',
      '.pmk_tag{min-height:18px;white-space:nowrap;border-radius:4px;align-items:center;padding:0 5px;font-size:11px;line-height:18px;display:inline-flex}',
      '.pmk_tag[data-on="true"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.pmk_tag[data-level="high"]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.pmk_tag[data-level="medium"]{background:color-mix(in srgb,var(--dsw-alias-state-warning-primary) 12%,transparent);color:var(--dsw-alias-state-warning-primary)}',
      '.pmk_tag[data-level="safe"],.pmk_tag[data-level="low"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.pmk_actions{display:flex;flex-wrap:nowrap;align-items:center;gap:6px;flex:none}',
      '.pmk_primary,.pmk_ghost{-webkit-appearance:none;appearance:none;margin:0;border:1px solid transparent;font:inherit;font-size:12px;font-weight:400;line-height:1;letter-spacing:normal;cursor:pointer;border-radius:6px;padding:0 10px;height:28px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;text-decoration:none}',
      '.pmk_primary{background:var(--dsw-alias-state-business-primary);color:#fff}',
      '.pmk_primary:hover:not(:disabled){filter:brightness(1.05)}',
      '.pmk_primary:disabled{opacity:.5;cursor:not-allowed}',
      '.pmk_ghost{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:transparent}',
      '.pmk_ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.pmk_ghost:disabled{opacity:.5;cursor:not-allowed}',
      '.pmk_confirm{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;padding:10px 14px 12px;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform)}',
      '.pmk_confirm p{margin:0;flex:1;min-width:180px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.pmk_details{display:flex;flex-direction:column;gap:8px;padding:12px 14px 14px;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform)}',
      '.pmk_id{overflow-wrap:anywhere;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code);font-size:11px;line-height:16px}',
      '.pmk_riskNote{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.pmk_about{display:flex;flex-direction:column;gap:6px}',
      '.pmk_subhead{margin:0;font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.pmk_about p{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}',
      '.pmk_about ul{margin:0;padding-left:18px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}',
      '.pmk_about pre{margin:0;max-height:6.5em;overflow:auto;white-space:pre-wrap;background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:8px 10px;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px}',
      '.pmk_more{color:var(--dsw-alias-state-business-primary);font-size:12px;line-height:18px;text-decoration:none}',
      '.pmk_more:hover{text-decoration:underline}',
      '.pmk_sr{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}',
      '@media (prefers-reduced-motion:no-preference){.pmk_chevron{transition:transform .14s var(--ds-ease-in-out,ease)}}',
    ].join('');

    function injectStyles() {
      const tagId = 'dsh-plugin-market/MarketTab';
      if (typeof document === 'undefined') return;
      let el = document.querySelector('style[data-plugin-css="' + tagId + '"]');
      if (!el) {
        el = document.createElement('style');
        el.dataset.plugin = 'dsh-plugin-market';
        el.dataset.pluginCss = tagId;
        document.head.appendChild(el);
      }
      el.textContent = CSS;
    }

    function IconSearch() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'aria-hidden': 'true' },
        h('circle', { cx: '7', cy: '7', r: '4.5' }),
        h('path', { d: 'M10.5 10.5L13.5 13.5' }),
      );
    }

    function IconChevron() {
      return h('svg', { className: 'pmk_chevron', width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'aria-hidden': 'true' },
        h('path', { d: 'M2.5 4.5L6 8l3.5-3.5' }),
      );
    }

    function unwrapInline(t) {
      return String(t)
        .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/<\/?[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function excerptReadme(raw, pluginName) {
      if (!raw || !String(raw).trim()) return { blocks: [], truncated: false };
      let s = String(raw).replace(/\r\n/g, '\n');
      s = s.replace(/^---\n[\s\S]*?\n---\n/, '');
      s = s.replace(/<!--[\s\S]*?-->/g, '');
      const lines = s.split('\n');
      const blocks = [];
      let para = [];
      let truncated = false;
      let chars = 0;
      const name = String(pluginName || '').trim().toLowerCase();
      const flush = () => {
        if (!para.length) return;
        const text = unwrapInline(para.join(' '));
        para = [];
        if (!text) return;
        blocks.push({ type: 'p', text });
        chars += text.length;
      };
      for (let i = 0; i < lines.length; i += 1) {
        if (chars >= 640 || blocks.length >= 6) { truncated = true; break; }
        const line = lines[i];
        const t = line.trim();
        if (t && (t.startsWith('|') || t.startsWith('[![') || t.startsWith('![') || t.startsWith('<img') || t.startsWith('<p align') || t.startsWith('<div') || t.startsWith('<br') || /^<\/?(h[1-6]|details|summary|table|thead|tbody|tr|td|th|center|p)\b/i.test(t) || /^[-*_]{3,}$/.test(t) || /^\[[^\]]+\]:\s*https?:/.test(t))) continue;
        if (!t) { flush(); continue; }
        if (t.startsWith('```')) {
          flush();
          const code = [];
          i += 1;
          while (i < lines.length && !lines[i].trim().startsWith('```')) {
            if (code.length < 4) code.push(lines[i]);
            else truncated = true;
            i += 1;
          }
          const body = code.join('\n').trim();
          if (body) { blocks.push({ type: 'pre', text: body }); chars += Math.min(body.length, 200); }
          continue;
        }
        const heading = t.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          flush();
          const title = unwrapInline(heading[2]);
          if (title && title.toLowerCase() !== name && !/^(install(ation)?|getting started|quick start|usage|license|badges?|table of contents|toc|contributing|changelog|credits|安装|使用方法?|快速开始|许可证|目录|贡献)$/i.test(title)) {
            blocks.push({ type: 'h', text: title });
            chars += title.length;
          }
          continue;
        }
        const li = t.match(/^[-*+]\s+(.+)$/) || t.match(/^\d+\.\s+(.+)$/);
        if (li) {
          flush();
          const item = unwrapInline(li[1]);
          if (item) {
            const last = blocks[blocks.length - 1];
            if (last && last.type === 'ul') last.items.push(item);
            else blocks.push({ type: 'ul', items: [item] });
            chars += item.length;
          }
          continue;
        }
        para.push(t);
      }
      flush();
      return { blocks, truncated };
    }

    function riskLabel(t, level) {
      if (level === 'high') return t('riskHigh');
      if (level === 'medium') return t('riskMedium');
      if (level === 'low') return t('riskLow');
      if (level === 'safe') return t('riskSafe');
      return t('riskUnknown');
    }

    function renderAbout(t, info, plugin) {
      if (info === undefined) return h('p', { className: 'pmk_status' }, t('loading'));
      const excerpt = excerptReadme(info && info.readme, plugin.name);
      const url = (info && info.url) || plugin.url;
      if (!excerpt.blocks.length) {
        return h('div', { className: 'pmk_about' },
          h('p', { className: 'pmk_status' }, t('noReadme')),
          url ? h('a', { className: 'pmk_more', href: url, target: '_blank', rel: 'noreferrer' }, t('readMore')) : null,
        );
      }
      return h('div', { className: 'pmk_about' },
        excerpt.blocks.map((b, i) => {
          if (b.type === 'h') return h('p', { key: i, className: 'pmk_subhead' }, b.text);
          if (b.type === 'pre') return h('pre', { key: i }, b.text);
          if (b.type === 'ul') return h('ul', { key: i }, b.items.map((item, j) => h('li', { key: j }, item)));
          return h('p', { key: i }, b.text);
        }),
        (excerpt.truncated || url) ? h('a', { className: 'pmk_more', href: url, target: '_blank', rel: 'noreferrer' }, t('readMore')) : null,
      );
    }

    // Wire names must not collide with RemoteNamespaceService (install/remove/has/…).
    const Json = { parse(v) { return v; } };
    const jsonCodec = (sym) => ({ mode: 'strict', typeSymbol: sym, schema: Json });
    const requestParam = (optional) => [{
      name: 'request',
      wire: 'request',
      source: 'json',
      codec: jsonCodec('dsh-plugin-market#Json'),
      ...(optional ? { acceptsUndefined: true } : {}),
    }];
    const remoteMethod = (method, parameters) => ({
      id: 'dsh-plugin-market#pluginMarket/' + method,
      service: 'pluginMarket',
      namespace: 'pluginMarket',
      method,
      invocation: { kind: 'direct' },
      parameters,
      result: jsonCodec('dsh-plugin-market#' + method + 'Result'),
    });
    const PLUGIN_MARKET_REMOTE = {
      package: 'dsh-plugin-market',
      descriptors: [
        remoteMethod('search', requestParam(true)),
        remoteMethod('detail', requestParam(false)),
        remoteMethod('categories', []),
        remoteMethod('trending', requestParam(true)),
        remoteMethod('recent', requestParam(true)),
        remoteMethod('status', []),
        remoteMethod('sync', []),
        remoteMethod('installPlugin', requestParam(false)),
        remoteMethod('uninstall', requestParam(false)),
        remoteMethod('update', requestParam(false)),
        remoteMethod('installed', []),
        remoteMethod('statusOf', requestParam(false)),
      ],
    };

    async function unwrapRemote(promise) {
      const result = await promise;
      if (result && typeof result === 'object' && 'ok' in result) {
        if (!result.ok) {
          const err = result.error;
          throw new Error((err && (err.message || err.code)) || 'remote failed');
        }
        return result.value;
      }
      return result;
    }

    const inject = ['slots', 'locale', 'remote'];

    async function apply(ctx) {
      injectStyles();

      const remote = ctx.remote || ctx.get('remote');
      if (!remote || typeof remote.$mount !== 'function') {
        throw new Error('plugin-market: ctx.remote.$mount unavailable');
      }
      await remote.$mount(PLUGIN_MARKET_REMOTE);

      const locale = ctx.locale || ctx.get('locale');
      if (locale && typeof locale.register === 'function') {
        ctx.effect(() => locale.register(NS, { zh: ZH, en: EN }), 'plugin-market.locale');
      }

      // Nested fiber may legally read ctx.remote.pluginMarket; React never does.
      ctx.inject(['slots', 'locale', 'remote', 'remote.pluginMarket'], (scope) => {
        const api = scope.remote.pluginMarket;
        const t = scope.locale.bind(NS);
        const face = () => ({
          search: (req) => unwrapRemote(api.search(req)),
          categories: () => unwrapRemote(api.categories()),
          detail: (pluginId) => unwrapRemote(api.detail({ pluginId })),
          installPlugin: (pluginId) => unwrapRemote(api.installPlugin({ pluginId, confirm: true })),
          uninstall: (pluginId) => unwrapRemote(api.uninstall({ pluginId })),
          sync: () => unwrapRemote(api.sync()),
        });
        scope.slots.inject('settings.plugins.tab', () => scope.slots.register({
          name: 'settings.plugins.tab',
          id: 'market',
          order: 20,
          label: () => t('tab'),
          locale: NS,
          inject: face,
        }, MarketTab));
      });
    }

    function MarketTab(props) {
      const { t, search, categories, detail, installPlugin, uninstall, sync } = props;
      const catalogId = useId();
      const [query, setQuery] = useState('');
      const [debounced, setDebounced] = useState('');
      const [category, setCategory] = useState('');
      const [cats, setCats] = useState([]);
      const [state, setState] = useState({ status: 'loading' });
      const [expanded, setExpanded] = useState(null);
      const [details, setDetails] = useState({});
      const [confirm, setConfirm] = useState(null);
      const [busy, setBusy] = useState(false);
      const [msg, setMsg] = useState('');
      const [request, setRequest] = useState(0);

      useEffect(() => {
        const id = setTimeout(() => setDebounced(query), 220);
        return () => clearTimeout(id);
      }, [query]);

      useEffect(() => {
        let current = true;
        categories().then((rows) => { if (current && Array.isArray(rows)) setCats(rows); }).catch(() => {});
        return () => { current = false; };
      }, [categories, request]);

      useEffect(() => {
        let current = true;
        setState((prev) => prev.status === 'ready' ? prev : { status: 'loading' });
        search({ query: debounced || '', category: category || undefined, pageSize: 80, sortBy: 'stars' })
          .then((snapshot) => {
            if (!current) return;
            setState({ status: 'ready', snapshot: snapshot || { plugins: [], total: 0 } });
          })
          .catch(() => { if (current) setState({ status: 'error' }); });
        return () => { current = false; };
      }, [search, debounced, category, request]);

      useEffect(() => {
        if (expanded === null) return;
        if (details[expanded] || details[expanded] === null) return;
        let current = true;
        detail(expanded)
          .then((row) => { if (current) setDetails((prev) => ({ ...prev, [expanded]: row || null })); })
          .catch(() => { if (current) setDetails((prev) => ({ ...prev, [expanded]: null })); });
        return () => { current = false; };
      }, [detail, expanded, details]);

      const plugins = state.status === 'ready' && Array.isArray(state.snapshot.plugins) ? state.snapshot.plugins : [];
      const total = state.status === 'ready' && typeof state.snapshot.total === 'number' ? state.snapshot.total : plugins.length;

      const retry = () => {
        setState({ status: 'loading' });
        setMsg('');
        setRequest((n) => n + 1);
      };

      const runAction = (kind, id) => {
        setBusy(true); setMsg('');
        const call = kind === 'install' ? installPlugin(id) : uninstall(id);
        call
          .then((r) => {
            if (r && r.needsConfirm) { setMsg(t('needsConfirm')); return; }
            if (r && r.success) {
              setMsg(kind === 'install' ? t('installed') : t('uninstall'));
              setConfirm(null);
              setDetails((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              });
              setRequest((n) => n + 1);
            } else {
              setMsg((r && r.error) || 'failed');
            }
          })
          .catch((e) => setMsg(String((e && e.message) || e)))
          .finally(() => setBusy(false));
      };

      const doSync = () => {
        setBusy(true); setMsg('');
        sync()
          .then((r) => {
            setMsg(t('synced') + (r && r.totalPlugins != null ? ' ' + r.totalPlugins : ''));
            setDetails({});
            setRequest((n) => n + 1);
          })
          .catch((e) => setMsg(String((e && e.message) || e)))
          .finally(() => setBusy(false));
      };

      const actionBar = (p, info) => {
        const url = (info && info.url) || p.url;
        const installed = p.isInstalled || (info && info.isInstalled);
        return h('div', { className: 'pmk_actions' },
          url ? h('button', {
            type: 'button',
            className: 'pmk_ghost',
            onClick: () => { window.open(url, '_blank', 'noopener,noreferrer'); },
          }, t('openRepo')) : null,
          installed
            ? h('button', { type: 'button', className: 'pmk_ghost', onClick: () => setConfirm({ kind: 'uninstall', id: p.id }) }, t('uninstall'))
            : h('button', { type: 'button', className: 'pmk_primary', onClick: () => setConfirm({ kind: 'install', id: p.id }) }, t('install')),
        );
      };

      return h('div', { className: 'pmk_section', 'aria-busy': state.status === 'loading' || busy },
        state.status === 'loading' ? h('p', { className: 'pmk_status' }, t('loading')) : null,
        state.status === 'error' ? h('div', { className: 'pmk_failure' },
          h('p', { role: 'alert' }, t('error')),
          h('button', { type: 'button', className: 'pmk_ghost', onClick: retry }, t('retry')),
        ) : null,
        state.status === 'ready' ? h('div', { className: 'pmk_catalog' },
          h('label', { className: 'pmk_search' },
            h(IconSearch, null),
            h('span', { className: 'pmk_sr' }, t('search')),
            h('input', {
              type: 'search',
              value: query,
              placeholder: t('search'),
              'aria-label': t('search'),
              onChange: (e) => setQuery(e.target.value),
            }),
          ),
          h('div', { className: 'pmk_chips' },
            h('button', { type: 'button', className: 'pmk_chip', 'data-on': !category ? 'true' : 'false', onClick: () => setCategory('') }, t('all')),
            cats.map((c) => h('button', {
              key: c.id,
              type: 'button',
              className: 'pmk_chip',
              'data-on': category === c.id ? 'true' : 'false',
              onClick: () => setCategory(c.id),
            }, c.name, c.pluginCount != null ? ' ' + c.pluginCount : '')),
          ),
          h('div', { className: 'pmk_heading' },
            h('h3', null, t('catalog')),
            h('span', null, String(total)),
            h('div', { className: 'pmk_toolbar' },
              msg ? h('span', { className: 'pmk_msg' }, msg) : null,
              h('button', { type: 'button', className: 'pmk_ghost', disabled: busy, onClick: doSync }, t('sync')),
            ),
          ),
          plugins.length === 0 ? h('p', { className: 'pmk_status' }, debounced || category ? t('emptySearch') : t('empty')) : null,
          plugins.length > 0 ? h('ul', { className: 'pmk_cards' },
            plugins.map((p) => {
              const open = expanded === p.id;
              const info = details[p.id];
              const detailId = catalogId + '-details-' + encodeURIComponent(p.id);
              const level = (info && info.permissionLevel) || p.permissionLevel || 'unknown';
              const confirming = confirm && confirm.id === p.id;
              const author = (info && info.author) || p.author;
              return h('li', {
                key: p.id,
                className: 'pmk_card',
                'data-open': open ? 'true' : undefined,
                'data-installed': p.isInstalled ? 'true' : undefined,
              },
                h('button', {
                  type: 'button',
                  className: 'pmk_head',
                  'aria-expanded': open,
                  'aria-controls': detailId,
                  onClick: () => setExpanded((cur) => cur === p.id ? null : p.id),
                },
                  h('span', { className: 'pmk_titleRow' },
                    h('strong', { className: 'pmk_title', title: p.name }, p.name),
                    h('span', { className: 'pmk_meta' },
                      h('span', { className: 'pmk_stars' }, '★ ' + String(p.stars || 0)),
                      h(IconChevron, null),
                    ),
                  ),
                  h('span', { className: 'pmk_desc' }, p.description || '\u00a0'),
                ),
                confirming
                  ? h('div', { className: 'pmk_confirm' },
                      h('p', null, confirm.kind === 'install' ? t('confirmInstall') : t('confirmUninstall'), ' · ', t('confirmHint')),
                      h('div', { className: 'pmk_actions' },
                        h('button', { type: 'button', className: 'pmk_primary', disabled: busy, onClick: () => runAction(confirm.kind, p.id) }, t(confirm.kind === 'install' ? 'install' : 'uninstall')),
                        h('button', { type: 'button', className: 'pmk_ghost', onClick: () => setConfirm(null) }, t('cancel')),
                      ),
                    )
                  : h('div', { className: 'pmk_foot' },
                      h('ul', { className: 'pmk_facts' },
                        p.isInstalled ? h('li', null, h('span', { className: 'pmk_tag', 'data-on': 'true' }, t('installed'))) : null,
                        author ? h('li', null, author) : null,
                        level !== 'unknown' ? h('li', null, h('span', { className: 'pmk_tag', 'data-level': level }, riskLabel(t, level))) : null,
                      ),
                      actionBar(p, info),
                    ),
                open ? h('div', { className: 'pmk_details', id: detailId },
                  h('code', { className: 'pmk_id' }, p.id),
                  (level === 'high' || level === 'medium') ? h('p', { className: 'pmk_riskNote' }, t('riskHint')) : null,
                  renderAbout(t, info, p),
                ) : null,
              );
            }),
          ) : null,
          h('p', { className: 'pmk_disclaimer' }, t('disclaimer')),
        ) : null,
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.NS = NS;
    return module.exports;
  },
});
