/* Eyebrow label (.eyebrow) with the heliotrope dot. */
import type { ReactNode } from 'react';

export function Eyebrow({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div className="eyebrow">
      <span className="eyebrow__dot" />
      <span id={id}>{children}</span>
    </div>
  );
}
