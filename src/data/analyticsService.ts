/* =====================================================================
   Analytics service.
   Produces every dashboard figure — funnel, conversions, guaranteed value,
   fees, commission, the volume breakdowns and the 12-month trend — from the
   parametric model. Referrer sees its own slice; commission uses per-partner
   rates.

   INTEGRATION: replace getDashboardData / getMonthlyTrend with calls to
   period- and partner-scoped analytics endpoints. The model in
   mock/analyticsModel.ts then goes.
   ===================================================================== */
import type { Period, PartnerScope, Role } from './types';
import { KEYS, loadString, saveString } from './storage';
import {
  ANNUAL, AVG_RENT, BASE_PAID_FULL, BASE_PAID_REF, BASE_SENT_FULL, BASE_SENT_REF,
  DEFAULT_PERIOD, PERIODS, REF_FRACTION, SHAPE_FULL, SHAPE_REF, TREND_MONTHS,
  scaleRows, type PeriodDef, type ShapeRow,
} from './mock/analyticsModel';
import { getRatesFor, weightFor } from './partnersService';

export function getPeriods(): Period[] {
  return PERIODS.map((p) => ({ ...p }));
}

export function getSelectedPeriod(): Period {
  const id = loadString(KEYS.period);
  return PERIODS.find((p) => p.id === id) || PERIODS.find((p) => p.id === DEFAULT_PERIOD)!;
}

export function setSelectedPeriod(id: string): void {
  saveString(KEYS.period, id);
}

function fmtMoney(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`;
}
export function fmtBig(n: number): string {
  if (n >= 1e6) return `£${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `£${Math.round(n / 1e3)}k`;
  return `£${Math.round(n)}`;
}

export interface DashboardModel {
  sub: string;
  funnelScope: string;
  sent: string;
  paid: string;
  deed: string;
  sp: string;
  pd: string;
  overall: string;
  guaranteed: string;
  deedcount: string;
  fees: string;
  commTag: string;
  commHeadline: string;
  commSecondLbl: string;
  commSecondVal: string;
  rent: string;
  stuckSent: string;
  stuckPaid: string;
  branchScope: string;
  agencyScope: string;
  referrerTitle: string;
  referrerScope: string;
  branches: ShapeRow[];
  agencies: ShapeRow[];
  referrers: ShapeRow[];
}

/** Build every dashboard figure for a role, period and partner scope. */
export function getDashboardData(role: Role, period: PeriodDef | Period, scope: PartnerScope): DashboardModel {
  const isRef = role === 'referrer';
  const w = isRef ? 1 : weightFor(scope);
  const sent = isRef ? Math.max(1, Math.round(period.fSent * REF_FRACTION)) : Math.round(period.fSent * w);
  const paid = Math.round(sent * period.sp);
  const deed = Math.round(paid * period.pd);
  const feesNum = paid * AVG_RENT;
  const shape = isRef ? SHAPE_REF : SHAPE_FULL;
  const baseSent = isRef ? BASE_SENT_REF : BASE_SENT_FULL;
  const basePaid = isRef ? BASE_PAID_REF : BASE_PAID_FULL;
  const kc = sent / baseSent;
  const kf = paid / basePaid;
  const baseStuck = isRef ? [8, 3] : [74, 27];
  const rates = getRatesFor(scope);
  const pPct = Math.round(rates.partner * 100);
  const aPct = Math.round(rates.agent * 100);

  return {
    sub: isRef
      ? 'Your referrals from sent through to deed issued, across every agency and branch you refer to.'
      : 'Live view of referrals from sent through to deed issued across all agencies and branches.',
    funnelScope: isRef ? 'Sent to Paid to Deed Issued · your referrals' : 'Sent to Paid to Deed Issued · all branches',
    sent: sent.toLocaleString('en-GB'),
    paid: paid.toLocaleString('en-GB'),
    deed: deed.toLocaleString('en-GB'),
    sp: `${Math.round((paid / sent) * 100)}%`,
    pd: `${Math.round((deed / paid) * 100)}%`,
    overall: `${Math.round((deed / sent) * 100)}%`,
    guaranteed: fmtBig(deed * ANNUAL),
    deedcount: deed.toLocaleString('en-GB'),
    fees: fmtMoney(feesNum),
    commTag: isRef ? `Your agent commission · ${aPct}% of one month's rent` : `Partner · ${pPct}% of one month's rent`,
    commHeadline: isRef ? fmtMoney(feesNum * rates.agent) : fmtMoney(feesNum * rates.partner),
    commSecondLbl: isRef ? `Passed to opndoor as partner (${pPct}%)` : `Agent commission (${aPct}% of one month's rent)`,
    commSecondVal: isRef ? fmtMoney(feesNum * rates.partner) : fmtMoney(feesNum * rates.agent),
    rent: '£2,180',
    stuckSent: Math.round(baseStuck[0] * kc).toString(),
    stuckPaid: Math.round(baseStuck[1] * kc).toString(),
    branchScope: isRef ? 'your branches' : 'top branches',
    agencyScope: isRef ? 'your agency' : 'by agency',
    referrerTitle: isRef ? 'Your monthly volume' : 'Volume by referrer',
    referrerScope: isRef ? 'recent months' : 'top performers',
    branches: scaleRows(shape.branches, kc, kf),
    agencies: scaleRows(shape.agencies, kc, kf),
    referrers: scaleRows(shape.referrers, kc, kf),
  };
}

export type TrendView = 'month' | 'branch' | 'agency' | 'referrer';
export type TrendMeasure = 'commission' | 'value' | 'count';

/** The 12-month trend rows for a breakdown, independent of the period filter. */
export function getMonthlyTrend(view: TrendView): ShapeRow[] {
  if (view === 'month') {
    return TREND_MONTHS.map((m): ShapeRow => [m[0], m[1], Math.round(m[1] * AVG_RENT * 0.8)]);
  }
  const key = view === 'branch' ? 'branches' : view === 'agency' ? 'agencies' : 'referrers';
  return scaleRows(SHAPE_FULL[key], 3.754, 3.832);
}

/** Commission uses the partner rate for the active scope (no hard-coded constant). */
export function trendPartnerRate(role: Role, scope: PartnerScope): number {
  void role;
  return getRatesFor(scope).partner;
}
