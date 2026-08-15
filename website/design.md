# Design — DSH 插件市场公开站

Locked system for `website/`. Pages share this system; do not rotate themes per route.

## Genre
modern-minimal · technical catalog

## Intent
- Audience: DeepSeek Harness 用户与插件作者
- Use: 浏览目录、复制 `dsh plugin add` 命令（安装在 DSH 设置内完成）
- Tone: utilitarian · 简约大气

## Macrostructure family
- Marketing / home: Catalogue — brand masthead → short hero + install command → category index → ranked list → search
- Content pages (category / plugin): Long Document quiet — breadcrumb → title → meta → body

## Theme (tokens)
- `--color-paper`   oklch(98.5% 0.004 250)
- `--color-paper-2` oklch(96% 0.006 250)
- `--color-ink`     oklch(22% 0.025 255)
- `--color-ink-2`   oklch(45% 0.02 255)
- `--color-rule`    oklch(88% 0.01 255)
- `--color-accent`  oklch(48% 0.14 255)
- `--color-focus`   oklch(55% 0.16 255)
- `--color-cmd`     oklch(18% 0.03 255)

## Typography
- Display: Space Grotesk, weight 600–700, roman
- Body: IBM Plex Sans, weight 400–500
- Mono: IBM Plex Mono

## Signature
Install command strip — the only dense dark block on an otherwise quiet page.

## Anti-patterns to avoid
- Warm cream paper + terracotta accent (AI default)
- Purple gradients, glow, pill clusters, fake browser chrome
- Stats / secondary marketing in the first viewport
- Dense newspaper columns / zero-radius broadsheet pastiche
