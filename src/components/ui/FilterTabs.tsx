/* =====================================================================
   FilterTabs — the pill tab strip (.ftabs/.ftab) used for the applications
   status filter. Each tab shows a label and an optional count.
   ===================================================================== */
import type { ReactNode } from 'react';

export interface TabDef {
  id: string;
  label: ReactNode;
  count?: number;
}

export function FilterTabs({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="ftabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} className={`ftab${active === t.id ? ' is-active' : ''}`} role="tab" onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null && <span className="ftab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
