'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="copy-btn" onClick={onCopy}>
      {copied ? t('copy.done') : label || t('copy.label')}
    </button>
  );
}
