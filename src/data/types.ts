/* =====================================================================
   Domain types for the Guarantee Referral Portal.
   These mirror the data model in HANDOFF.md section 6. The service layer
   (src/data/*) returns these shapes today from mock data; a real back end
   would return the same shapes from API calls.
   ===================================================================== */

/** The three portal roles. "superadmin" is opndoor admin in code. */
export type Role = 'superadmin' | 'management' | 'referrer';

/** A partner id, or the special "all partners combined" scope (opndoor admin only). */
export type PartnerScope = string;
export const ALL_PARTNERS = 'all';

/** Application lifecycle. */
export type Status = 'sent' | 'paid' | 'deed';
export type PartnerStatus = 'active' | 'onboarding' | 'paused';
export type UserStatus = 'active' | 'pending';

/* ---------- Partner ---------- */
export interface Partner {
  id: string;
  name: string;
  status: PartnerStatus;
  /** Live-from month, e.g. "2024-09". */
  since: string;
  /** Demo analytics weight; a real back end would sum real records instead. */
  weight: number;
  primary?: boolean;
  users: number;
  apps: number;
  /** Per-partner commission rates (fractions of one month's rent). Never hard-coded. */
  partnerRate: number;
  agentRate: number;
}

export interface CommissionRates {
  partner: number;
  agent: number;
}

/* ---------- Organisation hierarchy ---------- */
export interface Branch {
  name: string;
  area: string;
  referrers?: number;
  referrals: number;
  guaranteed: string;
  fees?: number;
  /** Set when a referrer created this on the fly; surfaced in reconciliation. */
  unreviewed?: boolean;
}

export interface Agency {
  /** Owning partner id. The same name under two partners is two records. */
  partner: string;
  name: string;
  group?: string;
  users?: number;
  referrals: number;
  guaranteed: string;
  fees?: number;
  /** UI expand state (seeded so the primary agency starts open). */
  open?: boolean;
  branches: Branch[];
  unreviewed?: boolean;
}

/* ---------- User ---------- */
export interface User {
  name: string;
  role: Role;
  lastActive: string;
  status: UserStatus;
  /** Partner id, or "opndoor" for opndoor admin staff (who belong to no partner). */
  partner: string;
}

/* ---------- Application (referral) ---------- */
export interface ApplicationSummary {
  ref: string;
  tenant: string;
  prop: string;
  branch: string;
  agency: string;
  /** Legacy beneficiary label retained for search only; the deed is in favour of the property. */
  ben: string;
  rent: number;
  status: Status;
  date: string; // ISO yyyy-mm-dd
  /** 1 when the demo referrer (Priya Nair) owns this referral. */
  owner: number;
  partner: string;
}

/** Display-ready record for the detail view (see applicationsService.getApplicationDetail). */
export interface ApplicationDetail {
  ref: string;
  status: Status;
  statusLabel: string;
  name: string;
  initials: string;
  title: string;
  role: string;
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  addr1: string;
  city: string;
  county: string;
  postcode: string;
  agency: string;
  branch: string;
  agentAddr: string;
  rent: string;
  rentNum: number;
  referrer: string;
  tenancyStart: string;
  tenancyStartDate: Date;
  sentAt: Date;
  paidAt: Date | null;
  deedAt: Date | null;
  sentStr: string;
  paidStr: string | null;
  deedStr: string | null;
  issue: string | null;
  expiry: string | null;
  annual: string;
  paymentDate: Date | null;
}

/* ---------- Help & resources ---------- */
export interface HelpResource {
  id: string;
  icon: string;
  type: string;
  title: string;
  desc: string;
  meta: string;
  href?: string;
  file?: { name: string; url: string; mime: string };
}
export interface HelpFaq {
  id: string;
  q: string;
  a: string;
}
export interface HelpManager {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}
export interface HelpContent {
  gettingStarted: HelpResource[];
  templates: HelpResource[];
  faqs: HelpFaq[];
  managers: HelpManager[];
}
export type HelpResourceSection = 'gettingStarted' | 'templates';

/* ---------- Reconciliation ---------- */
export type HubspotState = 'synced' | 'pending' | 'none';
export interface ReconciliationRecord {
  id: string;
  type: 'agency' | 'branch';
  name: string;
  parent: string | null;
  by: string;
  when: string;
  refs: number;
  match: string | null;
  score: number;
  hs: HubspotState;
  hsCo: string | null;
}

/* ---------- Analytics ---------- */
export interface Period {
  id: string;
  label: string;
  fSent: number;
  sp: number;
  pd: number;
}
