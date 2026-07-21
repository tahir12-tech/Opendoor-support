/* =====================================================================
   Session context — the seam between authentication and the app.


   Mock mode (no Supabase / tests): the demo role switcher drives role and
   the mock service data is used. Status is always "ready", no gate.


   Supabase mode: the real session drives everything. An authenticated
   session (email + password) is trusted directly — no TOTP step-up. The dev
   role switcher remains (a UI lens; data stays RLS-scoped to the session).
   ===================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ALL_PARTNERS, authService, getSelectedPartner, homePartner, setHomePartner,
  setSelectedPartner as persistPartner, getSelectedPeriod, setSelectedPeriod as persistPeriod,
  type PartnerScope, type Period, type Role,
} from '@/data';
import { KEYS, loadString, saveString } from '@/data/storage';
import { ROLES, type RoleIdentity } from '@/constants/roles';
import { SUPABASE_ENABLED, supabase } from '@/lib/supabase';
import { hydrateFromSupabase } from '@/lib/hydrate';
import { clearSessionAlive, startHeartbeat, stopHeartbeat } from '@/session/browserSession';


export type SessionStatus = 'loading' | 'signedOut' | 'needsMfa' | 'ready';


interface Profile {
  userId: string;
  role: Role;
  name: string;
  email: string;
  partner: string | null;
}


interface SessionValue {
  role: Role;
  setRole: (role: Role) => void;
  user: RoleIdentity;
  currentUserId: string | null;
  partnerScope: PartnerScope;
  selectedPartner: PartnerScope;
  setSelectedPartner: (id: PartnerScope) => void;
  period: Period;
  setPeriod: (id: string) => void;
  status: SessionStatus;
  authError: string | null;
  markMfaVerified: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  dataVersion: number;
}


const SessionContext = createContext<SessionValue | null>(null);


function initialRole(): Role {
  const r = loadString(KEYS.role);
  return r === 'superadmin' || r === 'management' || r === 'referrer' ? r : 'superadmin';
}


function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emb = (x: any): any => (Array.isArray(x) ? x[0] : x);


export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(initialRole);
  const [selectedPartner, setSelectedPartnerState] = useState<PartnerScope>(() => getSelectedPartner());
  const [period, setPeriodState] = useState<Period>(() => getSelectedPeriod());
  const [status, setStatus] = useState<SessionStatus>(SUPABASE_ENABLED ? 'loading' : 'ready');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const hydratedFor = useRef<string | null>(null);
  const hydration = useRef<{ userId: string; promise: Promise<void> } | null>(null);


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


  // Resolve the Supabase session -> status, and hydrate. AAL2/TOTP check
  // removed: an authenticated (password-only) session is trusted directly.
  const resolve = useCallback(async () => {
    if (!SUPABASE_ENABLED || !supabase) {
      setStatus('ready');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfile(null);
        setStatus('signedOut');
        return;
      }
      startHeartbeat();
      const userId = session.user.id;
      const { data, error } = await supabase
        .from('users')
        .select('role, full_name, email, status, partner:partners(slug)')
        .eq('id', userId)
        .single();
      if (error || !data) {
        setAuthError(error?.message ?? 'Could not load your profile.');
        setStatus('signedOut');
        return;
      }
      // Deactivated mid-session: sign out immediately so deactivation takes effect at once.
      if ((data.status as string) === 'deactivated') {
        await supabase.auth.signOut();
        stopHeartbeat();
        clearSessionAlive();
        hydratedFor.current = null;
        hydration.current = null;
        setProfile(null);
        setAuthError('This account has been deactivated. Contact your administrator.');
        setStatus('signedOut');
        return;
      }
      const prof: Profile = {
        userId,
        role: data.role as Role,
        name: data.full_name as string,
        email: data.email as string,
        partner: emb(data.partner)?.slug ?? null,
      };
      if (prof.partner) setHomePartner(prof.partner);
      setProfile(prof);
      setRole(prof.role);
      if (hydratedFor.current !== userId) {
        if (hydratedFor.current !== null && hydratedFor.current !== userId) {
          persistPartner(ALL_PARTNERS);
          setSelectedPartnerState(ALL_PARTNERS);
        }
        if (hydration.current?.userId !== userId) {
          hydration.current = { userId, promise: hydrateFromSupabase(userId) };
        }
        try {
          await hydration.current.promise;
        } catch (e) {
          hydration.current = null;
          throw e;
        }
        hydratedFor.current = userId;
        setDataVersion((v) => v + 1);
      }
      setAuthError(null);
      setStatus('ready');
    } catch (e) {
      hydratedFor.current = null;
      hydration.current = null;
      setAuthError(e instanceof Error ? e.message : 'Sign-in failed.');
      setStatus('signedOut');
    }
  }, [setRole]);


  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return;
    void resolve();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void resolve();
    });
    return () => sub.subscription.unsubscribe();
  }, [resolve]);


  // Kept for interface compatibility (unused by Login now, harmless no-op call site).
  const markMfaVerified = useCallback(() => {
    startHeartbeat();
  }, []);


  const signOut = useCallback(async () => {
    if (SUPABASE_ENABLED) {
      hydratedFor.current = null;
      hydration.current = null;
      stopHeartbeat();
      clearSessionAlive();
      persistPartner(ALL_PARTNERS);
      setSelectedPartnerState(ALL_PARTNERS);
      await authService.signOut();
      setProfile(null);
      setStatus('signedOut');
    }
  }, []);


  const refresh = useCallback(async () => {
    if (SUPABASE_ENABLED && hydratedFor.current) {
      await hydrateFromSupabase(hydratedFor.current);
    }
    setDataVersion((v) => v + 1);
  }, []);


  useEffect(() => {
    document.documentElement.setAttribute('data-role', role);
  }, [role]);


  const partnerScope = role === 'superadmin' ? selectedPartner : homePartner();


  const user: RoleIdentity = profile
    ? { name: profile.name, label: ROLES[profile.role].label, initials: initialsOf(profile.name) }
    : ROLES[role];


  const value = useMemo<SessionValue>(
    () => ({ role, setRole, user, currentUserId: profile?.userId ?? null, partnerScope, selectedPartner, setSelectedPartner, period, setPeriod, status, authError, markMfaVerified, signOut, refresh, dataVersion }),
    [role, setRole, user, profile, partnerScope, selectedPartner, setSelectedPartner, period, setPeriod, status, authError, markMfaVerified, signOut, refresh, dataVersion],
  );


  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}


export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}


export { ALL_PARTNERS };

