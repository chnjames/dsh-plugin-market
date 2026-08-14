/** Canonical category catalog shared by host cache, overlay, and the public site. */

export interface CategoryDef {
  id: string;
  name: string;
  nameEn: string;
  description: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'tools', name: '工具增强', nameEn: 'Tools', description: '新增工具类能力' },
  { id: 'web-ui', name: '界面美化', nameEn: 'Web UI', description: 'UI 扩展、主题、皮肤' },
  { id: 'workflow', name: '工作流', nameEn: 'Workflow', description: '自动化、定时、任务编排' },
  { id: 'session', name: '会话管理', nameEn: 'Session', description: '会话导入导出、分享、回退' },
  { id: 'skills', name: '技能扩展', nameEn: 'Skills', description: 'Skill 包、提示词工程' },
  { id: 'vision', name: '视觉能力', nameEn: 'Vision', description: '图片、OCR、视觉模型' },
  { id: 'provider', name: '能力提供者', nameEn: 'Provider', description: '模型、沙箱、存储 Provider' },
  { id: 'integration', name: '第三方集成', nameEn: 'Integration', description: '外部平台桥接' },
  { id: 'developer', name: '开发工具', nameEn: 'Developer', description: '插件开发、调试、模板' },
  { id: 'productivity', name: '效率工具', nameEn: 'Productivity', description: '通知、快捷操作' },
  { id: 'entertainment', name: '娱乐摸鱼', nameEn: 'Entertainment', description: '游戏、贴纸、趣味插件' },
  { id: 'other', name: '其他', nameEn: 'Other', description: '无法归类的插件' },
];

export function categoryById(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
