/* Tag chip (.tag). Default heliotrope, plus --admin and --primary variants. */
import type { ReactNode } from 'react';

export function Tag({ variant, children, id }: { variant?: 'admin' | 'primary'; children: ReactNode; id?: string }) {
  return <span className={`tag${variant ? ` tag--${variant}` : ''}`} id={id}>{children}</span>;
}
