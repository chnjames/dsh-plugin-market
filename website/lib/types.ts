export interface RegistryPlugin {
  id: string;
  source: 'github' | 'npm';
  name: string;
  description: string;
  category: string;
  author: string;
  url: string;
  stars: number;
  downloads: number;
  version: string;
  license: string;
  language: string;
  topics: string[];
  keywords: string[];
  installSpec: string;
  installCmd: string;
  permissionLevel: string;
  updatedAt: string;
  readmeUrl?: string;
}

export interface PluginRegistry {
  generatedAt: string;
  source: string;
  total: number;
  plugins: RegistryPlugin[];
}

export const CATEGORIES = [
  { id: 'tools', name: '工具增强', nameEn: 'Tools' },
  { id: 'web-ui', name: '界面美化', nameEn: 'Web UI' },
  { id: 'workflow', name: '工作流', nameEn: 'Workflow' },
  { id: 'session', name: '会话管理', nameEn: 'Session' },
  { id: 'skills', name: '技能扩展', nameEn: 'Skills' },
  { id: 'vision', name: '视觉能力', nameEn: 'Vision' },
  { id: 'provider', name: '能力提供者', nameEn: 'Provider' },
  { id: 'integration', name: '第三方集成', nameEn: 'Integration' },
  { id: 'developer', name: '开发工具', nameEn: 'Developer' },
  { id: 'productivity', name: '效率工具', nameEn: 'Productivity' },
  { id: 'entertainment', name: '娱乐摸鱼', nameEn: 'Entertainment' },
  { id: 'other', name: '其他', nameEn: 'Other' },
] as const;

export function pluginSlug(id: string): string {
  return id.replaceAll(':', '--').replaceAll('/', '__');
}

export function pluginIdFromSlug(slug: string): string {
  return decodeURIComponent(slug).replaceAll('__', '/').replaceAll('--', ':');
}

export function installCommand(plugin: RegistryPlugin): string {
  return plugin.installCmd || `dsh plugin --profile web add ${plugin.installSpec}`;
}

export function riskLabel(level: string): string {
  if (level === 'high') return '高权限提示';
  if (level === 'medium') return '需注意';
  if (level === 'low') return '较低';
  if (level === 'safe') return '外观类';
  return '未评估';
}
