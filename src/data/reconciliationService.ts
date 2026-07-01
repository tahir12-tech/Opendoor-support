/* =====================================================================
   Reconciliation service (opndoor admin only).
   The queue of agencies and branches created on the fly by referrers,
   plus the canonical records available to merge into and the HubSpot
   mapping state.

   INTEGRATION: getQueue -> GET the flagged records + duplicate-suggestion
   (name similarity) + HubSpot mapping. confirmRecord promotes to canonical;
   mergeRecord reassigns the record's referrals to a canonical record and
   retires the duplicate. Held in memory (resets on reload).
   ===================================================================== */
import type { ReconciliationRecord } from './types';

/** Canonical records available to merge into (mirror the live hierarchy). */
export const CANON_AGENCIES = ['Foxglove Residential', 'Marylebone & Co', 'Hartwell Estates', 'Northbank Lettings'];
export const CANON_BRANCHES = [
  'South Kensington · Foxglove Residential', 'Chelsea · Foxglove Residential', 'Fulham · Foxglove Residential',
  'Marylebone · Marylebone & Co', 'Fitzrovia · Marylebone & Co',
  'Clapham · Hartwell Estates', 'Balham · Hartwell Estates',
  'Shoreditch · Northbank Lettings', 'Islington · Northbank Lettings',
];

const QUEUE: ReconciliationRecord[] = [
  { id: 'r1', type: 'branch', name: 'Sth Kensington', parent: 'Foxglove Residential', by: 'James Okafor', when: '18 Jun 2026 · 14:22', refs: 1, match: 'South Kensington · Foxglove Residential', score: 92, hs: 'synced', hsCo: 'Foxglove Residential (South Kensington)' },
  { id: 'r2', type: 'agency', name: 'Marylebone and Co.', parent: null, by: 'Aisha Khan', when: '17 Jun 2026 · 09:48', refs: 2, match: 'Marylebone & Co', score: 88, hs: 'pending', hsCo: null },
  { id: 'r3', type: 'branch', name: 'Wandsworth', parent: 'Hartwell Estates', by: 'Marcus Lin', when: '16 Jun 2026 · 16:05', refs: 3, match: null, score: 0, hs: 'none', hsCo: null },
  { id: 'r4', type: 'branch', name: 'Shoreditch High St', parent: 'Northbank Lettings', by: 'Oliver Grant', when: '15 Jun 2026 · 11:30', refs: 1, match: 'Shoreditch · Northbank Lettings', score: 85, hs: 'synced', hsCo: 'Northbank Lettings (Shoreditch)' },
  { id: 'r5', type: 'agency', name: 'Camden Town Lettings', parent: null, by: 'Daniel Wright', when: '13 Jun 2026 · 10:12', refs: 1, match: null, score: 0, hs: 'pending', hsCo: null },
];

export function getQueue(): ReconciliationRecord[] {
  return QUEUE.slice();
}

/** Confirm a flagged record as a new canonical record. */
export function confirmRecord(id: string): ReconciliationRecord | null {
  const idx = QUEUE.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const [removed] = QUEUE.splice(idx, 1);
  return removed;
}

/** Merge a flagged record into a canonical one (its referrals are reassigned). */
export function mergeRecord(id: string, _into: string): ReconciliationRecord | null {
  const idx = QUEUE.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const [removed] = QUEUE.splice(idx, 1);
  return removed;
}
