/* =====================================================================
   RoleOnly — replaces the prototype's data-role-only attribute.
   Renders its children only when the active role is in `roles`.
   (Role gating here is UI-side; the back end must enforce access too.)
   ===================================================================== */
import type { ReactNode } from 'react';
import type { Role } from '@/data';
import { useSession } from '@/session/SessionContext';

export function RoleOnly({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { role } = useSession();
  if (!roles.includes(role)) return null;
  return <>{children}</>;
}
