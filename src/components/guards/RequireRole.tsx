/* =====================================================================
   RequireRole — route guard for opndoor-admin-only screens (Partners,
   Reconciliation, the opndoor team view). Non-admin roles are redirected
   to the dashboard. Nav items for these screens are already hidden by role;
   this stops direct-URL access too.

   NOTE: the prototype only hid the nav and relied on the back end to
   enforce access. This guard is the front-end half of that enforcement;
   the back end must still check every request.
   ===================================================================== */
import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@/data';
import { useSession } from '@/session/SessionContext';

export function RequireRole({ roles, redirectTo = '/dashboard' }: { roles: Role[]; redirectTo?: string }) {
  const { role } = useSession();
  if (!roles.includes(role)) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
