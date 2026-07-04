/* =====================================================================
   Supabase client — the single connection to the back end.

   SUPABASE_ENABLED is the switch between "real mode" and "mock mode":
   - Real mode (env configured, not under test): the app requires a real
     login (password + MFA), reads are RLS-scoped, mutations hit the DB.
   - Mock mode (no env, or under vitest): the service layer keeps using the
     in-memory mock seed and the dev role switcher. This keeps the unit and
     render smoke tests meaningful and lets the app run with no back end.

   SESSION LIFETIME (this portal holds tenant PII, so sessions are deliberately
   short-lived): the auth token is stored in sessionStorage, NOT localStorage.
   sessionStorage is scoped to the tab/window and is normally discarded when the
   browser is fully closed — but it is NOT an unconditional guarantee: browser
   "restore last session" / crash recovery can re-hydrate it into a new runtime.
   So sessionStorage alone is necessary but not sufficient. The hard guarantee
   lives in SessionContext: AAL2 is trusted only when TOTP was verified in the
   CURRENT page runtime (a non-persisted in-memory marker). The real-world
   behaviour is therefore: a same-tab refresh keeps you signed in; a browser quit
   (or any restore into a fresh runtime) forces a fresh TOTP challenge before any
   data loads, because the in-memory marker cannot be restored from storage.
   There is no "keep me signed in" opt-out.
   ===================================================================== */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when we should talk to Supabase (configured, and not in a test run). */
export const SUPABASE_ENABLED = Boolean(url && key) && import.meta.env.MODE !== 'test';

/** The client, or null when no env is configured (mock mode). */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          // sessionStorage (not the default localStorage): tab-scoped and normally
          // discarded on browser quit. The definitive re-auth guarantee is the
          // in-runtime AAL2 marker in SessionContext, not this storage choice.
          storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

/** The client asserted non-null. Call only behind a SUPABASE_ENABLED check. */
export function sb(): SupabaseClient {
  if (!supabase) throw new Error('Supabase client is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  return supabase;
}
