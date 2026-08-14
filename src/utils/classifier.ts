// ============================================================
// DSH Plugin Market - Plugin Classifier
// ============================================================

import type { RiskLevel } from '../types.js';

interface ClassificationRule {
  category: string;
  keywords: string[];
  field: 'name' | 'description' | 'topics' | 'keywords' | 'all';
}

const classificationRules: ClassificationRule[] = [
  // 视觉能力
  {
    category: 'vision',
    field: 'all',
    keywords: ['vision', 'image', 'ocr', 'screenshot', '视觉', '图片', '识图', 'modlens', 'drawing', 'paint'],
  },
  // 工作流
  {
    category: 'workflow',
    field: 'all',
    keywords: ['workflow', 'automation', 'schedule', 'task', 'loop', 'cron', '工作流', '自动化', '定时', '任务', '循环'],
  },
  // 会话管理
  {
    category: 'session',
    field: 'all',
    keywords: ['session', 'chat', 'history', 'share', 'rewind', 'import', 'export', 'message', '会话', '聊天', '历史', '分享', '回退', '导入', '导出', '消息'],
  },
  // 技能扩展
  {
    category: 'skills',
    field: 'all',
    keywords: ['skill', 'skills', 'prompt', 'prompting', '技能', '提示词'],
  },
  // 第三方集成
  {
    category: 'integration',
    field: 'all',
    keywords: ['bridge', 'integration', 'bot', 'wechat', 'feishu', 'telegram', 'qq', 'discord', 'wecom', 'slack', '集成', '桥接', '飞书', '微信', '电报'],
  },
  // 开发工具
  {
    category: 'developer',
    field: 'all',
    keywords: ['dev', 'developer', 'debug', 'template', 'inspect', 'doctor', 'sandbox', '开发', '调试', '模板', '沙箱', '诊断'],
  },
  // 效率工具
  {
    category: 'productivity',
    field: 'all',
    keywords: ['notify', 'notification', 'shortcut', 'productivity', '效率', '通知', '快捷', '提醒'],
  },
  // 娱乐摸鱼
  {
    category: 'entertainment',
    field: 'all',
    keywords: ['game', 'games', 'fun', 'sticker', 'emoji', 'entertainment', 'pet', '摸鱼', '游戏', '贴纸', '表情', '宠物', '五子棋', 'stock', '广告', 'ads'],
  },
  // 能力提供者
  {
    category: 'provider',
    field: 'all',
    keywords: ['provider', 'sandbox', 'model', 'storage', 'llm', 'openai', 'codex', '提供者'],
  },
  // 界面美化（放后面，避免覆盖更具体的分类）
  {
    category: 'web-ui',
    field: 'all',
    keywords: ['ui', 'theme', 'skin', 'sidebar', 'panel', 'tui', 'web-ui', '界面', '主题', '皮肤', '侧边栏', '面板', '终端', 'navbar', 'focus', 'visualize', 'genui', 'whale', '鲸鱼'],
  },
  // 工具增强（放最后，作为兜底之一）
  {
    category: 'tools',
    field: 'all',
    keywords: ['tool', 'tools', 'util', 'helper', 'custom-tool', 'openapi', 'api', 'fetch', 'browser', 'search', '工具', '浏览器', '搜索'],
  },
];

/**
 * 推断插件分类
 */
export function classifyPlugin(info: {
  name: string;
  description: string;
  topics: string[];
  keywords: string[];
}): string {
  const nameLower = info.name.toLowerCase();
  const descLower = info.description.toLowerCase();
  const topicsLower = info.topics.map((t) => t.toLowerCase());
  const keywordsLower = info.keywords.map((k) => k.toLowerCase());

  let bestCategory = 'other';
  let bestScore = 0;

  for (const rule of classificationRules) {
    let score = 0;

    for (const keyword of rule.keywords) {
      const kwLower = keyword.toLowerCase();

      if (rule.field === 'name' || rule.field === 'all') {
        if (nameLower.includes(kwLower)) score += 3;
      }
      if (rule.field === 'description' || rule.field === 'all') {
        if (descLower.includes(kwLower)) score += 1;
      }
      if (rule.field === 'topics' || rule.field === 'all') {
        if (topicsLower.some((t) => t.includes(kwLower))) score += 2;
      }
      if (rule.field === 'keywords' || rule.field === 'all') {
        if (keywordsLower.some((k) => k.includes(kwLower))) score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
    }
  }

  // 最低阈值：至少 2 分才归类，否则归 other
  return bestScore >= 2 ? bestCategory : 'other';
}

// ---------- 风险级别推断 ----------

interface RiskRule {
  level: RiskLevel;
  keywords: string[];
}

const highRiskKeywords = [
  'shell', 'bash', 'command', 'exec', 'execute', 'terminal', 'tui',
  'sandbox', 'system', 'root', 'admin', 'sudo',
  'git', 'identity', 'credential', 'token', 'auth',
  'fs', 'filesystem', 'file-write', 'write-file',
];

const mediumRiskKeywords = [
  'file', 'filesystem', 'read', 'write', 'edit',
  'api', 'fetch', 'http', 'request', 'web', 'browser',
  'network', 'download', 'upload',
  'database', 'db', 'sql',
  'search', 'scrape', 'crawl',
];

const lowRiskKeywords = [
  'notify', 'notification', 'share', 'search', 'view',
  'sticker', 'emoji', 'theme', 'skin', 'ui',
  'read-only', 'readonly', 'info', 'stats',
];

const safeKeywords = [
  'theme', 'skin', 'sticker', 'emoji', 'badge', 'label',
  'ui-only', 'cosmetic', 'visual-only',
];

/**
 * 推断插件风险级别
 */
export function inferRiskLevel(info: {
  name: string;
  description: string;
  topics: string[];
  keywords: string[];
}): RiskLevel {
  const text = [
    info.name,
    info.description,
    ...info.topics,
    ...info.keywords,
  ].join(' ').toLowerCase();

  // 先检查高风险
  for (const kw of highRiskKeywords) {
    if (text.includes(kw)) {
      return 'high';
    }
  }

  // 再检查中风险
  for (const kw of mediumRiskKeywords) {
    if (text.includes(kw)) {
      return 'medium';
    }
  }

  // 再检查低风险
  for (const kw of lowRiskKeywords) {
    if (text.includes(kw)) {
      return 'low';
    }
  }

  // 安全
  for (const kw of safeKeywords) {
    if (text.includes(kw)) {
      return 'safe';
    }
  }

  return 'unknown';
}
