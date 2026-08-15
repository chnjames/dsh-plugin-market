'use client';

import { useId, useState } from 'react';
import { CopyButton } from './CopyButton';

type Tab = { id: string; label: string; command: string };

export function InstallTerminal({
  tabs,
  defaultTab,
}: {
  tabs: Tab[];
  defaultTab?: string;
}) {
  const panelId = useId();
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) || tabs[0];
  if (!current) return null;

  return (
    <div className="terminal">
      <div className="terminal__bar">
        <div className="terminal__tabs" role="tablist">
          {tabs.map((t) => {
            const tabId = `${panelId}-tab-${t.id}`;
            return (
              <button
                key={t.id}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={t.id === current.id}
                aria-controls={panelId}
                tabIndex={t.id === current.id ? 0 : -1}
                className={`terminal__tab${t.id === current.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <CopyButton text={current.command} />
      </div>
      <pre
        id={panelId}
        className="terminal__body"
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${current.id}`}
      >
        <code>$ {current.command}</code>
      </pre>
    </div>
  );
}
