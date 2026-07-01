/* Thin data-table wrapper (.table-wrap > table.dt). Screens supply their own
   <thead>/<tbody> since cell content (avatars, pills, menus) is bespoke. */
import type { ReactNode } from 'react';

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="table-wrap">
      <table className={`dt${className ? ` ${className}` : ''}`}>{children}</table>
    </div>
  );
}
