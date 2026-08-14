// ============================================================
// DSH Plugin Market - Browser Client Half (static bundle)
// ============================================================
// Loaded by the DSH ModuleLoader through exports["./client"] + dsh.client.
// Registers two additive Slots:
//   - sidebar.footer.action : "插件市场" button beside Settings
//   - shell.overlay         : the plugin-market modal
// Data flows via ctx.remote.pluginMarket.* (Typert Gateway -> host service).
//
// No bundler: this file IS the client bundle. ModuleLoader provides `require`
// for react and @deepseek-ai/* deps; the wrapper below matches the shipped
// client.js format exactly.

window.__ModuleLoader__.load({
  id: 'dsh-plugin-market',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const React = require('react');

    const NS = 'plugin-market';
    const ZH = {
      open: '插件市场',
      title: '插件市场',
      searchPlaceholder: '搜索插件…',
      loading: '加载中…',
      empty: '无结果',
      error: '加载失败',
      installed: '已安装',
      install: '安装',
      uninstall: '卸载',
      close: '关闭',
      sync: '同步',
    };
    const EN = {
      open: 'Plugin Market',
      title: 'Plugin Market',
      searchPlaceholder: 'Search plugins…',
      loading: 'Loading…',
      empty: 'No results',
      error: 'Failed to load',
      installed: 'Installed',
      install: 'Install',
      uninstall: 'Uninstall',
      close: 'Close',
      sync: 'Sync',
    };

    const CSS = [
      '.pm-backdrop{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--dsw-alias-bg-base,#111) 55%,transparent);pointer-events:auto}',
      '.pm-modal{width:min(880px,92vw);max-height:82vh;overflow:auto;background:var(--dsw-alias-bg-overlay,#1e1e1e);color:var(--dsw-alias-label-primary,#eee);border-radius:12px;padding:20px;border:1px solid var(--dsw-alias-border-l2,#333);box-shadow:0 8px 32px rgba(0,0,0,.4)}',
      '.pm-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}',
      '.pm-title{margin:0;font-size:18px;font-weight:600}',
      '.pm-close{background:none;border:none;color:var(--dsw-alias-label-secondary,#aaa);font-size:22px;cursor:pointer;line-height:1;padding:4px 8px;border-radius:6px}',
      '.pm-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}',
      '.pm-search{width:100%;box-sizing:border-box;padding:8px 12px;margin-bottom:12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#333);background:var(--dsw-alias-bg-layer-1,#252525);color:inherit;font:inherit}',
      '.pm-search:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4a9eff);outline-offset:-1px}',
      '.pm-grid{list-style:none;margin:0;padding:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}',
      '.pm-card{border:1px solid var(--dsw-alias-border-l1,#333);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px}',
      '.pm-card[data-installed="true"]{border-color:var(--dsw-alias-state-success-primary,#3fb950)}',
      '.pm-card-name{font-weight:600;font-size:14px;word-break:break-all}',
      '.pm-card-meta{font-size:12px;opacity:.72}',
      '.pm-card-desc{font-size:12px;opacity:.82;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.pm-card-actions{display:flex;gap:8px;margin-top:4px}',
      '.pm-btn{font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#444);background:var(--dsw-alias-bg-layer-1,#252525);color:var(--dsw-alias-label-primary,#eee);border-radius:6px;padding:4px 10px;font-size:12px}',
      '.pm-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}',
      '.pm-btn[data-primary="true"]{background:var(--dsw-alias-state-business-primary,#4a9eff);border-color:transparent;color:#fff}',
      '.pm-status{font-size:12px;opacity:.7;margin:8px 0 0}',
      '.pm-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px}',
      '.pm-error{color:var(--dsw-alias-state-error-primary,#f85149);font-size:12px}',
      '.pm-footer-btn{width:100%;height:48px;display:flex;align-items:center;gap:8px;padding:0 12px;background:none;border:none;cursor:pointer;color:var(--dsw-alias-label-secondary,#aaa);font-size:13px}',
      '.pm-footer-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}',
    ].join('');

    /** Tiny module-level open-state bus shared by the button and the modal. */
    const bus = {
      listeners: new Set(),
      emit(evt) { for (const fn of this.listeners) fn(evt); },
      on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    };

    const inject = ['slots', 'locale'];

    function apply(ctx) {
      const slots = ctx.get('slots');
      if (!slots) return;

      if (typeof styles !== 'undefined' && typeof styles.insert === 'function') {
        styles.insert(CSS);
      }

      const locale = ctx.get('locale');
      const t = (key) => {
        let dict = ZH;
        try {
          const snap = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : null;
          if (snap && snap.id === 'en') dict = EN;
        } catch { /* keep zh */ }
        return dict[key] || key;
      };

      // shared open state
      let open = false;
      const openListeners = new Set();
      const setOpen = (v) => { open = v; for (const fn of openListeners) fn(v); };
      const subscribeOpen = (fn) => { openListeners.add(fn); return () => openListeners.delete(fn); };
      bus.on((evt) => { if (evt === 'open') setOpen(true); });

      // ---- shell.overlay: the modal ----
      function ModalHost() {
        const [, force] = React.useState(0);
        React.useEffect(() => subscribeOpen(() => force((n) => n + 1)), []);
        return React.createElement(MarketModal, { ctx, t, open, setOpen });
      }

      // ---- sidebar.footer.action: the button ----
      function FooterHost(props) {
        return React.createElement('button', {
          type: 'button',
          className: 'pm-footer-btn',
          onClick: () => bus.emit('open'),
          title: t('open'),
        },
          React.createElement('span', { 'aria-hidden': 'true' }, '📦'),
          props && props.wide ? React.createElement('span', null, t('open')) : null,
        );
      }

      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'plugin-market-modal', locale: NS },
        () => React.createElement(ModalHost, null),
      ));

      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
        { name: 'sidebar.footer.action', id: 'plugin-market', locale: NS },
        (props) => React.createElement(FooterHost, props),
      ));

      return () => {};
    }

    // ---- modal content ----
    function MarketModal({ ctx, t, open, setOpen }) {
      const [query, setQuery] = React.useState('');
      const [data, setData] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [msg, setMsg] = React.useState('');

      const remote = ctx.get('remote');

      const load = React.useCallback((q) => {
        if (!remote || !remote.pluginMarket) {
          setData({ error: 'remote.pluginMarket unavailable' });
          return;
        }
        setBusy(true);
        remote.pluginMarket.search({ query: q, pageSize: 50 })
          .then((r) => setData(r))
          .catch((e) => setData({ error: String((e && e.message) || e) }))
          .finally(() => setBusy(false));
      }, [remote]);

      React.useEffect(() => {
        if (open) load(query);
      }, [open, query, load]);

      if (!open) return React.createElement('div', null);

      const items = data && Array.isArray(data.plugins) ? data.plugins : [];
      const total = data && typeof data.total === 'number' ? data.total : null;

      const act = (kind, id) => {
        setBusy(true); setMsg('');
        const call = kind === 'install'
          ? remote.pluginMarket.install({ pluginId: id })
          : remote.pluginMarket.uninstall({ pluginId: id });
        call
          .then((r) => { setMsg((r && r.success) ? (kind === 'install' ? t('installed') : 'uninstalled') : 'failed'); load(query); })
          .catch((e) => setMsg(String((e && e.message) || e)))
          .finally(() => setBusy(false));
      };
      const doSync = () => {
        setBusy(true); setMsg('');
        remote.pluginMarket.sync()
          .then((r) => { setMsg('synced: ' + (r && r.totalPlugins)); load(query); })
          .catch((e) => setMsg(String((e && e.message) || e)))
          .finally(() => setBusy(false));
      };

      return React.createElement('div', { className: 'pm-backdrop', onClick: () => setOpen(false) },
        React.createElement('div', { className: 'pm-modal', onClick: (e) => e.stopPropagation() },
          React.createElement('div', { className: 'pm-header' },
            React.createElement('h2', { className: 'pm-title' }, t('title')),
            React.createElement('button', { className: 'pm-close', onClick: () => setOpen(false), 'aria-label': t('close') }, '×'),
          ),
          React.createElement('input', {
            className: 'pm-search',
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: t('searchPlaceholder'),
          }),
          data && data.error
            ? React.createElement('p', { className: 'pm-error' }, t('error'), ': ', data.error)
            : items.length === 0
              ? React.createElement('p', { className: 'pm-status' }, busy ? t('loading') : (data ? t('empty') : t('loading')))
              : React.createElement('ul', { className: 'pm-grid' },
                  items.map((p) => React.createElement('li', {
                    key: p.id,
                    className: 'pm-card',
                    'data-installed': p.isInstalled ? 'true' : 'false',
                  },
                    React.createElement('div', { className: 'pm-card-name' }, p.name),
                    React.createElement('div', { className: 'pm-card-meta' },
                      '⭐ ', p.stars, ' · ', p.category || 'other', ' · ', p.author || ''),
                    React.createElement('div', { className: 'pm-card-desc' }, (p.description || '').slice(0, 160)),
                    React.createElement('div', { className: 'pm-card-actions' },
                      p.isInstalled
                        ? React.createElement('button', { className: 'pm-btn', onClick: () => act('uninstall', p.id) }, t('uninstall'))
                        : React.createElement('button', { className: 'pm-btn', 'data-primary': 'true', onClick: () => act('install', p.id) }, t('install')),
                    ),
                  )),
                ),
          React.createElement('div', { className: 'pm-footer' },
            React.createElement('span', { className: 'pm-status' }, total !== null ? total + ' plugins' : '', msg ? ' · ' + msg : ''),
            React.createElement('button', { className: 'pm-btn', onClick: doSync, disabled: busy }, t('sync')),
          ),
        ),
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.NS = NS;
    return module.exports;
  },
});
