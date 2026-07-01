/* =====================================================================
   Applications service.
   Enforces partner isolation and the referrer "own referrals only" rule,
   builds the display-ready detail record, and exposes the referral
   lifecycle actions.

   INTEGRATION:
   - getApplications / countByStatus -> GET /applications with filters; the
     role + scope isolation shown here must ALSO be enforced server-side.
   - getApplicationDetail -> GET /applications/:ref.
   - createReferral -> POST /referrals (then Stripe for payment, PandaDoc
     for the deed; guarantee ref/issue/expiry assigned by the system).
   - amendTenancyStart -> PATCH that enforces the 7-day window server-side
     and reissues the Deed of Guarantee.
   ===================================================================== */
import type { ApplicationDetail, ApplicationSummary, PartnerScope, Role, Status } from './types';
import { ALL_PARTNERS } from './types';
import { AGENT_ADDR, APPLICATION_RECORDS, APPLICATIONS_LIST, type AppRecord } from './mock/applications';

const STATUS_LABEL: Record<Status, string> = { sent: 'Sent', paid: 'Paid', deed: 'Deed Issued' };

export interface AppScopeOpts {
  role: Role;
  scope: PartnerScope;
  /** opndoor admin's optional in-page partner sub-filter. */
  partner?: string;
}

export interface AppFilterOpts extends AppScopeOpts {
  status?: Status | 'all';
  agency?: string;
  branch?: string;
  q?: string;
  sort?: string;
}

/** Role + partner isolation only (drives counts and the "total" figure). */
function scopedSet(opts: AppScopeOpts): ApplicationSummary[] {
  let set = APPLICATIONS_LIST.slice();
  if (opts.scope !== ALL_PARTNERS) set = set.filter((r) => r.partner === opts.scope);
  if (opts.role === 'referrer') set = set.filter((r) => r.owner);
  return set;
}

export function countByStatus(opts: AppScopeOpts): { all: number; sent: number; paid: number; deed: number } {
  const set = scopedSet(opts);
  const counts = { all: set.length, sent: 0, paid: 0, deed: 0 };
  set.forEach((r) => {
    counts[r.status]++;
  });
  return counts;
}

/** The visible rows for the given filters (scoped + status/agency/branch/search/sort). */
export function getApplications(opts: AppFilterOpts): ApplicationSummary[] {
  let rows = scopedSet(opts);
  if (opts.partner) rows = rows.filter((r) => r.partner === opts.partner);
  rows = rows.filter((r) => {
    if (opts.status && opts.status !== 'all' && r.status !== opts.status) return false;
    if (opts.branch && r.branch !== opts.branch) return false;
    if (opts.agency && r.agency !== opts.agency) return false;
    if (opts.q) {
      const hay = `${r.tenant} ${r.prop} ${r.ref} ${r.ben} ${r.branch}`.toLowerCase();
      if (!hay.includes(opts.q.toLowerCase())) return false;
    }
    return true;
  });
  const sort = opts.sort || 'Newest first';
  rows = rows.slice().sort((a, b) => {
    if (sort === 'Oldest first') return a.date < b.date ? -1 : 1;
    if (sort === 'Rent: high to low') return b.rent - a.rent;
    return a.date > b.date ? -1 : 1;
  });
  return rows;
}

/** Distinct agency names within a scope (for the applications filter dropdown). */
export function agencyNamesForScope(opts: AppScopeOpts): string[] {
  const rows = scopedSet(opts).filter((r) => (opts.partner ? r.partner === opts.partner : true));
  const names: string[] = [];
  rows.forEach((r) => {
    if (!names.includes(r.agency)) names.push(r.agency);
  });
  return names.sort();
}

/** Distinct branch names within a scope, optionally limited to one agency. */
export function branchNamesForScope(opts: AppScopeOpts, agency?: string): string[] {
  const rows = scopedSet(opts).filter((r) => (opts.partner ? r.partner === opts.partner : true)).filter((r) => !agency || r.agency === agency);
  const names: string[] = [];
  rows.forEach((r) => {
    if (!names.includes(r.branch)) names.push(r.branch);
  });
  return names.sort();
}

/** Find the parent agency of a branch (used when arriving filtered by ?branch=). */
export function agencyOfBranch(branch: string): string | '' {
  const rec = APPLICATIONS_LIST.find((r) => r.branch === branch);
  return rec ? rec.agency : '';
}

/* ---------- Detail builder (deterministic, ported from portal-apps.js) ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = 86400000;

function parseISO(s: string): Date {
  const p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
function fmtShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtLong(d: Date): string {
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}
function addYear(d: Date): Date {
  return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
}
function deaccent(s: string): string {
  // Strip combining diacritical marks (U+0300–U+036F) after NFD decomposition.
  return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
}
function initials(n: string): string {
  return n.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function findRecord(ref: string | null): AppRecord | null {
  return APPLICATION_RECORDS.find((r) => r.ref === ref) ?? null;
}

export function getApplicationDetail(ref: string | null): ApplicationDetail {
  const r = findRecord(ref) || APPLICATION_RECORDS[0];
  const idx = APPLICATION_RECORDS.indexOf(r);
  const event = parseISO(r.date);
  let sentAt: Date;
  let paidAt: Date | undefined;
  let deedAt: Date | undefined;
  if (r.status === 'deed') {
    deedAt = event;
    paidAt = addDays(event, -2);
    sentAt = addDays(event, -6);
  } else if (r.status === 'paid') {
    paidAt = event;
    sentAt = addDays(event, -4);
  } else {
    sentAt = event;
  }
  const tenancyStart = addDays(sentAt, 16);
  const dobYear = 1999 - (idx % 9);
  const dob = new Date(dobYear, (idx * 5) % 12, ((idx * 7) % 27) + 1);
  const age = 2026 - dobYear - (new Date(2026, 5, 26) < new Date(2026, dob.getMonth(), dob.getDate()) ? 1 : 0);
  const emailUser = deaccent(r.name).toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.');
  const phoneTail = r.ref.replace(/\D/g, '').slice(-3);
  const annual = r.rent * 12;

  return {
    ref: r.ref,
    status: r.status,
    statusLabel: STATUS_LABEL[r.status],
    name: r.name,
    initials: initials(r.name),
    title: r.title,
    role: r.role,
    fullName: `${r.title} ${r.name}`,
    dob: `${fmtLong(dob)} (${age})`,
    email: `${emailUser}@gmail.com`,
    phone: `+44 7700 900${phoneTail}`,
    addr1: r.addr1,
    city: 'London',
    county: 'Greater London',
    postcode: r.postcode,
    agency: r.agency,
    branch: r.branch,
    agentAddr: AGENT_ADDR[r.branch] || `${r.branch}, London`,
    rent: `£${r.rent.toLocaleString('en-GB')}`,
    rentNum: r.rent,
    referrer: r.referrer,
    tenancyStart: fmtLong(tenancyStart),
    tenancyStartDate: tenancyStart,
    sentAt,
    paidAt: paidAt || null,
    deedAt: deedAt || null,
    sentStr: `${fmtShort(sentAt)} · 10:24`,
    paidStr: paidAt ? `${fmtShort(paidAt)} · 16:09` : null,
    deedStr: deedAt ? `${fmtShort(deedAt)} · 09:41` : null,
    issue: deedAt ? fmtShort(deedAt) : null,
    expiry: deedAt ? fmtShort(addYear(deedAt)) : null,
    annual: `£${annual.toLocaleString('en-GB')}`,
    paymentDate: paidAt || null,
  };
}

/* ---------- Lifecycle actions ---------- */

export interface CreateReferralInput {
  title: string;
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone: string;
  addr1: string;
  addr2: string;
  city: string;
  county: string;
  postcode: string;
  rent: number;
  tenancyStart: string;
  agency: string;
  branch: string;
}

/**
 * Create a referral (status = Sent).
 * INTEGRATION: POST /referrals. The back end assigns the guarantee reference,
 * then payment (Stripe) moves it to Paid and deed generation (PandaDoc) to
 * Deed Issued, assigning issue date and expiry. Mocked here as a new ref.
 */
export function createReferral(_input: CreateReferralInput): { ref: string } {
  const ref = `GR-${30000 + Math.floor(APPLICATIONS_LIST.length)}`;
  return { ref };
}

/** The amend window: the new start must be within 7 days either side of payment. */
export const AMEND_WINDOW_DAYS = 7;

export function amendWindow(payment: Date): { start: Date; end: Date } {
  return { start: new Date(payment.getTime() - AMEND_WINDOW_DAYS * DAY), end: new Date(payment.getTime() + AMEND_WINDOW_DAYS * DAY) };
}

export interface AmendResult {
  ok: boolean;
  reason?: string;
  issue?: Date;
  expiry?: Date;
}

/**
 * Amend the tenancy start date and reissue the deed.
 * INTEGRATION: PATCH /applications/:ref/tenancy-start — the 7-day-from-payment
 * rule MUST be enforced server-side, which then reissues the Deed of Guarantee
 * and recomputes issue/expiry. Mocked here by recomputing the dates.
 */
export function amendTenancyStart(payment: Date, newStart: Date): AmendResult {
  const win = amendWindow(payment);
  if (newStart < win.start || newStart > win.end) {
    return { ok: false, reason: `Must be within ${AMEND_WINDOW_DAYS} days of payment` };
  }
  return { ok: true, issue: new Date(2026, 5, 26), expiry: addYear(newStart) };
}
