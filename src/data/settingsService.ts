/* =====================================================================
   App settings service. Currently the bordereau underwriter insurance rate,
   persisted so it defaults to the last applied value instead of silently
   reverting, with every change audited (who, when, old -> new) via the
   set_app_setting_num RPC. Admin-only (the bordereau is admin-only).
   ===================================================================== */
import { SUPABASE_ENABLED, sb } from '@/lib/supabase';
import { DEFAULT_INSURANCE_RATE } from './mock/analyticsModel';

export interface BordereauRateMeta {
  rate: number;
  changedAt: Date | null;
  changedBy: string | null;
}

let BORDEREAU: BordereauRateMeta = { rate: DEFAULT_INSURANCE_RATE, changedAt: null, changedBy: null };

/** Replace the settings working copy from the back end (Supabase mode). */
export function hydrateSettings(meta: Partial<BordereauRateMeta>): void {
  BORDEREAU = {
    rate: meta.rate ?? DEFAULT_INSURANCE_RATE,
    changedAt: meta.changedAt ?? null,
    changedBy: meta.changedBy ?? null,
  };
}

/** The stored bordereau insurance rate (defaults until hydrated/changed). */
export function getBordereauRate(): number {
  return BORDEREAU.rate;
}

/** The stored rate plus who last changed it and when (for the modal caption). */
export function getBordereauRateMeta(): BordereauRateMeta {
  return { ...BORDEREAU };
}

/** Persist the bordereau insurance rate. Live mode calls the audited RPC; mock
    mode updates the working copy. A no-op change writes no audit entry. */
export async function setBordereauRate(rate: number): Promise<void> {
  if (SUPABASE_ENABLED) {
    const { data, error } = await sb().rpc('set_app_setting_num', { p_key: 'bordereau_insurance_rate', p_value: rate });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (Array.isArray(data) ? data[0] : data) as any;
    if (row) {
      BORDEREAU = {
        rate: Number(row.num_value),
        changedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        changedBy: row.updated_by_name ?? null,
      };
    }
    return;
  }
  if (BORDEREAU.rate !== rate) BORDEREAU = { rate, changedAt: new Date(), changedBy: 'You' };
}
