/* Status pill (.pill). Sent → Paid → Deed Issued, plus warn/danger/muted. */
import type { CSSProperties, ReactNode } from 'react';

export type PillVariant = 'sent' | 'paid' | 'deed' | 'warn' | 'danger' | 'muted';

export function Pill({ variant, children, style, className }: { variant: PillVariant; children: ReactNode; style?: CSSProperties; className?: string }) {
  return <span className={`pill pill--${variant}${className ? ` ${className}` : ''}`} style={style}>{children}</span>;
}
