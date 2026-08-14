/**
 * Shared classifier used by scripts/build-registry.mjs.
 * Keep scoring rules in sync with src/utils/classifier.ts.
 */

const classificationRules = [
  { category: 'vision', keywords: ['vision', 'image', 'ocr', 'screenshot', '视觉', '图片', '识图', 'modlens', 'drawing', 'paint'] },
  { category: 'workflow', keywords: ['workflow', 'automation', 'schedule', 'task', 'loop', 'cron', '工作流', '自动化', '定时', '任务', '循环'] },
  { category: 'session', keywords: ['session', 'chat', 'history', 'share', 'rewind', 'import', 'export', 'message', '会话', '聊天', '历史', '分享', '回退', '导入', '导出', '消息'] },
  { category: 'skills', keywords: ['skill', 'skills', 'prompt', 'prompting', '技能', '提示词'] },
  { category: 'integration', keywords: ['bridge', 'integration', 'bot', 'wechat', 'feishu', 'telegram', 'qq', 'discord', 'wecom', 'slack', '集成', '桥接', '飞书', '微信', '电报'] },
  { category: 'developer', keywords: ['dev', 'developer', 'debug', 'template', 'inspect', 'doctor', 'sandbox', '开发', '调试', '模板', '沙箱', '诊断'] },
  { category: 'productivity', keywords: ['notify', 'notification', 'shortcut', 'productivity', '效率', '通知', '快捷', '提醒'] },
  { category: 'entertainment', keywords: ['game', 'games', 'fun', 'sticker', 'emoji', 'entertainment', 'pet', '摸鱼', '游戏', '贴纸', '表情', '宠物', '五子棋', 'stock', '广告', 'ads'] },
  { category: 'provider', keywords: ['provider', 'sandbox', 'model', 'storage', 'llm', 'openai', 'codex', '提供者'] },
  { category: 'web-ui', keywords: ['ui', 'theme', 'skin', 'sidebar', 'panel', 'tui', 'web-ui', '界面', '主题', '皮肤', '侧边栏', '面板', '终端', 'navbar', 'focus', 'visualize', 'genui', 'whale', '鲸鱼'] },
  { category: 'tools', keywords: ['tool', 'tools', 'util', 'helper', 'custom-tool', 'openapi', 'api', 'fetch', 'browser', 'search', '工具', '浏览器', '搜索'] },
];

const highRiskAnyField = [
  'sudo', 'password', 'secret', 'keylogger', 'filesystem',
];

const highRiskIdentity = ['bash', 'ssh', 'credential', 'spawn'];

const mediumRiskKeywords = ['scrape', 'crawl'];

const cosmeticIdentity = ['theme', 'skin', 'sticker', 'emoji', 'cosmetic'];

function identityText(info) {
  return [info.name || '', ...(info.topics || []), ...(info.keywords || [])].join(' ').toLowerCase();
}

function allText(info) {
  return [info.name || '', info.description || '', ...(info.topics || []), ...(info.keywords || [])].join(' ').toLowerCase();
}

/** Word-boundary for English; substring for CJK. */
export function containsToken(haystack, keyword) {
  const token = String(keyword || '').toLowerCase();
  const text = String(haystack || '');
  if (!token || !text) return false;
  if (/[^\u0000-\u007F]/.test(token)) return text.includes(token);
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=[^a-z0-9]|$)`, 'i').test(text);
}

export function classifyPlugin(info) {
  const nameLower = (info.name || '').toLowerCase();
  const descLower = (info.description || '').toLowerCase();
  const topicsLower = (info.topics || []).map((t) => String(t).toLowerCase());
  const keywordsLower = (info.keywords || []).map((k) => String(k).toLowerCase());

  let bestCategory = 'other';
  let bestScore = 0;

  for (const rule of classificationRules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (containsToken(nameLower, keyword)) score += 3;
      if (containsToken(descLower, keyword)) score += 1;
      if (topicsLower.some((t) => containsToken(t, keyword))) score += 2;
      if (keywordsLower.some((k) => containsToken(k, keyword))) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
    }
  }

  return bestScore >= 2 ? bestCategory : 'other';
}

/** Heuristic hint from public text — not a permission audit. Default unknown. */
export function inferRiskLevel(info) {
  const all = allText(info);
  const identity = identityText(info);

  if (highRiskAnyField.some((kw) => containsToken(all, kw))) return 'high';
  if (highRiskIdentity.some((kw) => containsToken(identity, kw))) return 'high';
  if (cosmeticIdentity.some((kw) => containsToken(identity, kw))) return 'safe';
  if (mediumRiskKeywords.some((kw) => containsToken(all, kw))) return 'medium';
  return 'unknown';
}
