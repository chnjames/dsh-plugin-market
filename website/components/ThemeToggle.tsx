'use client';

import { Moon, Sun } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const toLight = theme === 'dark';

  return (
    <button
      type="button"
      className="tool-btn tool-btn--icon"
      aria-label={toLight ? t('nav.themeToLight') : t('nav.themeToDark')}
      onClick={toggle}
    >
      {toLight ? <Sun size={16} strokeWidth={1.75} aria-hidden="true" /> : <Moon size={16} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  );
}
