/** Strip GitHub-flavored chrome so Agent / UI can show a short readable excerpt. */

export interface ReadmeBlock {
  type: 'p' | 'h' | 'ul' | 'pre';
  text?: string;
  items?: string[];
}

export interface ReadmeExcerpt {
  blocks: ReadmeBlock[];
  truncated: boolean;
}

function unwrapInline(t: string): string {
  return t
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

const SKIP_HEADINGS = /^(install(ation)?|getting started|quick start|usage|license|badges?|table of contents|toc|contributing|changelog|credits|安装|使用方法?|快速开始|许可证|目录|贡献)$/i;

function skipLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith('|')) return true;
  if (t.startsWith('[![') || t.startsWith('![') || t.startsWith('<img') || t.startsWith('<p align') || t.startsWith('<div') || t.startsWith('<br')) return true;
  if (/^<\/?(h[1-6]|details|summary|table|thead|tbody|tr|td|th|center|p)\b/i.test(t)) return true;
  if (/^[-*_]{3,}$/.test(t)) return true;
  if (/^\[[^\]]+\]:\s*https?:/.test(t)) return true;
  return false;
}

export function excerptReadme(raw: string | undefined, pluginName = '', maxChars = 900): ReadmeExcerpt {
  if (!raw || !String(raw).trim()) return { blocks: [], truncated: false };
  let s = String(raw).replace(/\r\n/g, '\n');
  s = s.replace(/^---\n[\s\S]*?\n---\n/, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  const lines = s.split('\n');
  const blocks: ReadmeBlock[] = [];
  let para: string[] = [];
  let truncated = false;
  let chars = 0;
  const name = pluginName.trim().toLowerCase();

  const flushPara = () => {
    if (!para.length) return;
    const text = unwrapInline(para.join(' '));
    para = [];
    if (!text) return;
    blocks.push({ type: 'p', text });
    chars += text.length;
  };

  for (let i = 0; i < lines.length; i += 1) {
    if (chars >= maxChars || blocks.length >= 10) {
      truncated = true;
      break;
    }
    const line = lines[i];
    const t = line.trim();
    if (skipLine(line) && t) continue;
    if (!t) {
      flushPara();
      continue;
    }
    if (t.startsWith('```')) {
      flushPara();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        if (code.length < 4) code.push(lines[i]);
        else truncated = true;
        i += 1;
      }
      const body = code.join('\n').trim();
      if (body) {
        blocks.push({ type: 'pre', text: body });
        chars += Math.min(body.length, 200);
      }
      continue;
    }
    const heading = t.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushPara();
      const title = unwrapInline(heading[2]);
      if (title && title.toLowerCase() !== name && !SKIP_HEADINGS.test(title)) {
        blocks.push({ type: 'h', text: title });
        chars += title.length;
      }
      continue;
    }
    const li = t.match(/^[-*+]\s+(.+)$/) || t.match(/^\d+\.\s+(.+)$/);
    if (li) {
      flushPara();
      const item = unwrapInline(li[1]);
      if (item) {
        const last = blocks[blocks.length - 1];
        if (last && last.type === 'ul' && last.items) last.items.push(item);
        else blocks.push({ type: 'ul', items: [item] });
        chars += item.length;
      }
      continue;
    }
    para.push(t);
  }
  flushPara();
  return { blocks, truncated };
}

export function excerptReadmeText(raw: string | undefined, pluginName = ''): string {
  const { blocks } = excerptReadme(raw, pluginName);
  return blocks.map((b) => {
    if (b.type === 'ul') return (b.items || []).map((item) => '• ' + item).join('\n');
    return b.text || '';
  }).filter(Boolean).join('\n\n');
}
