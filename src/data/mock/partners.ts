/* =====================================================================
   Seed partner list (ported from portal-partners.js).
   Rightmove is the primary, fully-populated partner; Zoopla and
   OnTheMarket carry lighter data to show the multi-partner structure.

   Commission is a two-part, per-partner model. partnerRate and agentRate
   are fractions of the guarantor fee (one month's rent) and live on each
   partner record — they are NOT global constants.
   ===================================================================== */
import type { Partner } from '../types';

export const DEFAULT_PARTNER_RATE = 0.25;
export const DEFAULT_AGENT_RATE = 0.1;

/** The signed-in partner user's own partner (Management + Referrer are Rightmove staff here). */
export const HOME_PARTNER = 'rightmove';

export const PARTNERS_SEED: Partner[] = [
  { id: 'rightmove', name: 'Rightmove', weight: 1.0, primary: true, status: 'active', users: 11, apps: 342, since: '2024-09', partnerRate: 0.25, agentRate: 0.1 },
  { id: 'zoopla', name: 'Zoopla', weight: 0.34, status: 'active', users: 4, apps: 54, since: '2025-11', partnerRate: 0.25, agentRate: 0.1 },
  { id: 'onthemarket', name: 'OnTheMarket', weight: 0.16, status: 'active', users: 3, apps: 26, since: '2026-02', partnerRate: 0.25, agentRate: 0.1 },
];
