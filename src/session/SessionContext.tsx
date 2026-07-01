/* =====================================================================
   Session context — the app's "as if from an authenticated session" seam.
   Holds the active role, the resolved partner scope and the dashboard
   period. Management and Referrer are pinned to their home partner; opndoor
   admin's scope follows the partner selector.

   The demo role switcher lives here (setRole). In production, verify2fa()
   would seed this from the real session and the switcher would be removed.
   Values persist via the service layer so they survive a reload.
   ===================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ALL_PARTNERS, getSelectedPartner, homePartner, scopeFor, setSelectedPartner as persistPartner,
  getSelectedPeriod, setSelectedPeriod as persistPeriod, type PartnerScope, type Period, type Role,
} from '@/data';
import { KEYS, loadString, saveString } from '@/data/storage';
import { ROLES, type RoleIdentity } from '@/constants/roles';

interface SessionValue {
  role: Role;
  /** Demo switcher — replaced by a real session in production. */
  setRole: (role: Role) => void;
  /** The signed-in identity for the current role (sidebar footer, activity). */
  user: RoleIdentity;
  /** Resolved partner scope: a partner id, or "all" (opndoor admin only). */
  partnerScope: PartnerScope;
  /** The opndoor-admin partner selector value (equals partnerScope for admin). */
  selectedPartner: PartnerScope;
  setSelectedPartner: (id: PartnerScope) => void;
  period: Period;
  setPeriod: (id: string) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

function initialRole(): Role {
  const r = loadString(KEYS.role);
  return r === 'superadmin' || r === 'management' || r === 'referrer' ? r : 'superadmin';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(initialRole);
  const [selectedPartner, setSelectedPartnerState] = useState<PartnerScope>(() => getSelectedPartner());
  const [period, setPeriodState] = useState<Period>(() => getSelectedPeriod());

  const setRole = useCallback((next: Role) => {
    saveString(KEYS.role, next);
    setRoleState(next);
  }, []);

  const setSelectedPartner = useCallback((id: PartnerScope) => {
    persistPartner(id);
    setSelectedPartnerState(id);
  }, []);

  const setPeriod = useCallback((id: string) => {
    persistPeriod(id);
    setPeriodState(getSelectedPeriod());
  }, []);

  // Mirror portal.js: expose the role on <html> so role-scoped CSS
  // (e.g. [data-role="referrer"] .chartrow, [data-role="superadmin"] .res__admin) applies.
  useEffect(() => {
    document.documentElement.setAttribute('data-role', role);
  }, [role]);

  const partnerScope = role === 'superadmin' ? selectedPartner : homePartner();

  const value = useMemo<SessionValue>(
    () => ({ role, setRole, user: ROLES[role], partnerScope, selectedPartner, setSelectedPartner, period, setPeriod }),
    [role, setRole, partnerScope, selectedPartner, setSelectedPartner, period, setPeriod],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

/** Convenience: scopeFor for a role (kept aligned with the service rule). */
export function resolveScope(role: Role): PartnerScope {
  return scopeFor(role);
}

export { ALL_PARTNERS };
