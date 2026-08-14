// ============================================================
// DSH Plugin Market - Plugin Classifier
// Keep scoring rules in sync with shared/classifier.mjs.
// ============================================================

import type { RiskLevel } from '../types.js';

interface ClassificationRule {
  category: string;
  keywords: string[];
  field: 'name' | 'description' | 'topics' | 'keywords' | 'all';
}

const classificationRules: ClassificationRule[] = [
  {
    category: 'vision',
    field: 'all',
    keywords: ['vision', 'image', 'ocr', 'screenshot', '视觉', '图片', '识图', 'modlens', 'drawing', 'paint'],
  },
  {
    category: 'workflow',
    field: 'all',
    keywords: ['workflow', 'automation', 'schedule', 'task', 'loop', 'cron', '工作流', '自动化', '定时', '任务', '循环'],
  },
  {
    category: 'session',
    field: 'all',
    keywords: ['session', 'chat', 'history', 'share', 'rewind', 'import', 'export', 'message', '会话', '聊天', '历史', '分享', '回退', '导入', '导出', '消息'],
  },
  {
    category: 'skills',
    field: 'all',
    keywords: ['skill', 'skills', 'prompt', 'prompting', '技能', '提示词'],
  },
  {
    category: 'integration',
    field: 'all',
    keywords: ['bridge', 'integration', 'bot', 'wechat', 'feishu', 'telegram', 'qq', 'discord', 'wecom', 'slack', '集成', '桥接', '飞书', '微信', '电报'],
  },
  {
    category: 'developer',
    field: 'all',
    keywords: ['dev', 'developer', 'debug', 'template', 'inspect', 'doctor', 'sandbox', '开发', '调试', '模板', '沙箱', '诊断'],
  },
  {
    category: 'productivity',
    field: 'all',
    keywords: ['notify', 'notification', 'shortcut', 'productivity', '效率', '通知', '快捷', '提醒'],
  },
  {
    category: 'entertainment',
    field: 'all',
    keywords: ['game', 'games', 'fun', 'sticker', 'emoji', 'entertainment', 'pet', '摸鱼', '游戏', '贴纸', '表情', '宠物', '五子棋', 'stock', '广告', 'ads'],
  },
  {
    category: 'provider',
    field: 'all',
    keywords: ['provider', 'sandbox', 'model', 'storage', 'llm', 'openai', 'codex', '提供者'],
  },
  {
    category: 'web-ui',
    field: 'all',
    keywords: ['ui', 'theme', 'skin', 'sidebar', 'panel', 'tui', 'web-ui', '界面', '主题', '皮肤', '侧边栏', '面板', '终端', 'navbar', 'focus', 'visualize', 'genui', 'whale', '鲸鱼'],
  },
  {
    category: 'tools',
    field: 'all',
    keywords: ['tool', 'tools', 'util', 'helper', 'custom-tool', 'openapi', 'api', 'fetch', 'browser', 'search', '工具', '浏览器', '搜索'],
  },
];

/**
 * English tokens use word boundaries so `git` ≠ `github`, `system` ≠ `design-systems`,
 * `auth` ≠ `author`, `read` ≠ `readme`. CJK keywords stay substring matches.
 */
export function containsToken(haystack: string, keyword: string): boolean {
  const token = keyword.toLowerCase();
  if (!token || !haystack) return false;
  if (/[^\u0000-\u007F]/.test(token)) return haystack.includes(token);
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=[^a-z0-9]|$)`, 'i').test(haystack);
}

export function classifyPlugin(info: {
  name: string;
  description: string;
  topics: string[];
  keywords: string[];
}): string {
  const nameLower = (info.name || '').toLowerCase();
  const descLower = (info.description || '').toLowerCase();
  const topicsLower = (info.topics || []).map((t) => t.toLowerCase());
  const keywordsLower = (info.keywords || []).map((k) => k.toLowerCase());

  let bestCategory = 'other';
  let bestScore = 0;

  for (const rule of classificationRules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (rule.field === 'name' || rule.field === 'all') {
        if (containsToken(nameLower, keyword)) score += 3;
      }
      if (rule.field === 'description' || rule.field === 'all') {
        if (containsToken(descLower, keyword)) score += 1;
      }
      if (rule.field === 'topics' || rule.field === 'all') {
        if (topicsLower.some((t) => containsToken(t, keyword))) score += 2;
      }
      if (rule.field === 'keywords' || rule.field === 'all') {
        if (keywordsLower.some((k) => containsToken(k, keyword))) score += 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
    }
  }

  return bestScore >= 2 ? bestCategory : 'other';
}

/** Strong signals: match name, description, topics, keywords. */
const highRiskAnyField = [
  'sudo', 'password', 'secret', 'keylogger', 'filesystem',
];

/**
 * These words appear constantly in marketing copy ("desktop shell", "execute tasks").
 * Only trust them on identity fields (name / topics / keywords).
 */
const highRiskIdentity = ['bash', 'ssh', 'credential', 'spawn'];

const mediumRiskKeywords = ['scrape', 'crawl'];

const cosmeticIdentity = ['theme', 'skin', 'sticker', 'emoji', 'cosmetic'];

function identityText(info: {
  name: string;
  topics: string[];
  keywords: string[];
}): string {
  return [info.name, ...(info.topics || []), ...(info.keywords || [])].join(' ').toLowerCase();
}

function allText(info: {
  name: string;
  description: string;
  topics: string[];
  keywords: string[];
}): string {
  return [info.name, info.description, ...(info.topics || []), ...(info.keywords || [])].join(' ').toLowerCase();
}

/**
 * Heuristic hint from public marketing text. Not a sandbox / permission audit.
 * Default is `unknown`. Prefer missing a flag over alarming a theme or desktop wrapper.
 * Broad words (web, git, ui, system, file, command, shell, exec, upload) are excluded.
 */
export function inferRiskLevel(info: {
  name: string;
  description: string;
  topics: string[];
  keywords: string[];
}): RiskLevel {
  const all = allText(info);
  const identity = identityText(info);

  if (highRiskAnyField.some((kw) => containsToken(all, kw))) return 'high';
  if (highRiskIdentity.some((kw) => containsToken(identity, kw))) return 'high';
  if (cosmeticIdentity.some((kw) => containsToken(identity, kw))) return 'safe';
  if (mediumRiskKeywords.some((kw) => containsToken(all, kw))) return 'medium';
  return 'unknown';
}
