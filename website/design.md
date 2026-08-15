# Design — DSH 插件市场公开站

Locked system for `website/`. Pages share this system; do not rotate themes per route.

## Provenance
Studied DNA from https://www.deepseek.com/harness/ (brand kinship) · structure kept product-correct for a catalog.

## Genre
modern-minimal · technical catalog · Harness-adjacent voice

## Intent
- Audience: DeepSeek Harness 用户与插件作者
- Use: 发现插件 → 复制 `dsh plugin add`（安装在 DSH 设置内完成）
- Tone: utilitarian · technical · instrument-panel

## Preferences
- Default theme: **light**; dark via `data-theme` + localStorage `dsh-market-theme`
- Locale: **zh | en** via localStorage `dsh-market-lang` (+ `?lang=`)
- Header tools: outline buttons (Languages dropdown · Sun/Moon) — not emoji / not target-locale toggle

## Macrostructure family
- Home: **Ecosystem Index** — N13 search → split hero (copy + terminal) → optional how-to band → rails (热门 / 分类 / 最近) → browse note
- Category: **Index-First** — crumb → title → list
- Plugin: **Docs sheet** — crumb → title → graphite install card → meta → README excerpt

## Theme (tokens)
Studied-DNA hybrid on light paper (catalog readability) + Harness terminal / pill vocabulary.

- `--color-paper`   oklch(98.5% 0.004 250)
- `--color-paper-2` oklch(96% 0.006 250)
- `--color-ink`     oklch(18% 0.01 250)
- `--color-ink-2`   oklch(45% 0.015 250)
- `--color-rule`    oklch(88% 0.01 255)
- `--color-accent`  oklch(55% 0.16 250)   /* cool electric blue signal */
- `--color-focus`   oklch(58% 0.17 250)
- `--color-cmd`     oklch(14% 0.01 250)   /* graphite terminal */
- `--color-cmd-ink` oklch(96% 0.005 250)

## Typography
- Display: Montserrat 500–600 (Harness display)
- Body: DM Sans 400–500
- Mono: Fragment Mono (Harness terminal)

## Nav / Footer
- Nav: **N13** inline ⌘K search pill + wordmark + external links
- Footer: **Ft2** single quiet line

## Signature
1. Graphite install terminal card (tabs optional) — Harness kinship
2. Working ⌘K / Ctrl+K plugin palette
3. Discovery rails, not equal SKU catalogue

## Anti-patterns to avoid
- Warm cream + terracotta; purple gradients; inventing metrics
- Full-page aurora dark theme (hurts long lists)
- Fake browser traffic-light chrome as decoration
- N1a-only nav without search
