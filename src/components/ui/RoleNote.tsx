/* Role note banner (.rolenote) — the lilac "you are viewing…" callouts. */
import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function RoleNote({ icon = 'info', children, style }: { icon?: IconName; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="rolenote" style={style}>
      <Icon name={icon} />
      <span>{children}</span>
    </div>
  );
}
