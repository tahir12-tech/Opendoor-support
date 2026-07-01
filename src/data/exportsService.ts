/* =====================================================================
   Exports service — the three CSV exports (all GBP, dd/mm/yyyy, British).
   Rows are synthesised to match the modelled counts, exactly as the
   prototype does. Role gating is enforced here too, not just on the button:
   the application export is blocked for referrers, and the bordereau is
   opndoor-admin only.

   INTEGRATION: in production these are generated from real records by the
   back end with the same scoping and gating; replace each builder body.
   ===================================================================== */
import type { Period, Role } from './types';
import { ALL_PARTNERS } from './types';
import {
  ANNUAL, APP_BRANCHES, APP_RENTS, APP_REFERRERS, AVG_RENT,
  BX_FIRST, BX_FLATS, BX_LAST, BX_STREETS, BX_TITLES, TREND_MONTHS,
} from './mock/analyticsModel';
import { partnerName, getRatesFor, scopeFor } from './partnersService';

const DAY = 86400000;
const TODAY = new Date(2026, 5, 26);
const ALLTIME_START = new Date(2024, 8, 1);
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function dmy(x: Date): string {
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`;
}
function gbp(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`;
}
function pct(a: number, b: number): string {
  return b ? `${Math.round((a / b) * 100)}%` : '0%';
}
function addDays(x: Date, n: number): Date {
  return new Date(x.getTime() + n * DAY);
}

function periodRange(p: Period): [Date, Date] {
  if (p.id === 'thismonth') return [new Date(2026, 5, 1), new Date(2026, 5, 30)];
  if (p.id === 'lastmonth') return [new Date(2026, 4, 1), new Date(2026, 4, 31)];
  if (p.id === 'last7') return [addDays(TODAY, -6), TODAY];
  if (p.id === 'last30') return [addDays(TODAY, -29), TODAY];
  if (p.id === 'last90') return [addDays(TODAY, -89), TODAY];
  if (p.id === 'last12m') return [new Date(2025, 5, 27), TODAY];
  return [ALLTIME_START, TODAY];
}

type CsvRow = (string | number)[];
function toCSV(rows: CsvRow[]): string {
  return rows.map((r) => r.map((s) => `"${String(s).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

/** Trigger a browser download of a CSV string. */
export function downloadCsv(csv: string, name: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

interface EntityRow {
  name: string;
  parent: string;
  sent: number;
  paid: number;
  deed: number;
  fees: number;
}
interface ExportModel {
  sent: number;
  paid: number;
  deed: number;
  fees: number;
  stuckSent: number;
  stuckPaid: number;
  agencies: EntityRow[];
  branches: EntityRow[];
  referrers: EntityRow[];
}

function exportModel(role: Role, period: Period): ExportModel {
  const isRef = role === 'referrer';
  const sent = isRef ? Math.max(1, Math.round(period.fSent * (38 / 342))) : period.fSent;
  const paid = Math.round(sent * period.sp);
  const deed = Math.round(paid * period.pd);
  const fees = paid * AVG_RENT;
  const kc = sent / (isRef ? 38 : 342);
  const stuckSent = Math.round((isRef ? 8 : 74) * kc);
  const stuckPaid = Math.round((isRef ? 3 : 27) * kc);
  const shape = isRef
    ? { agencies: [['Foxglove Residential', 38, 88000]], branches: [['South Kensington', 16, 37000, 'Foxglove Residential'], ['Chelsea', 13, 34000, 'Foxglove Residential'], ['Fulham', 9, 18000, 'Foxglove Residential']], referrers: [['April', 14, 32000], ['March', 13, 30000], ['February', 11, 27000]] }
    : { agencies: [['Foxglove Residential', 214, 246240], ['Marylebone & Co', 152, 168000], ['Northbank Lettings', 108, 98000], ['Hartwell Estates', 96, 72000]], branches: [['South Kensington', 78, 169000, 'Foxglove Residential'], ['Marylebone', 72, 147000, 'Marylebone & Co'], ['Shoreditch', 63, 101000, 'Northbank Lettings'], ['Chelsea', 61, 153000, 'Foxglove Residential'], ['Clapham', 58, 82000, 'Hartwell Estates'], ['Fitzrovia', 54, 110000, 'Marylebone & Co']], referrers: [['Priya Nair', 38, 88000], ['James Okafor', 33, 82000], ['Sophie Bennett', 29, 63000], ['Daniel Wright', 24, 57000], ['Aisha Khan', 21, 45000], ['Marcus Lin', 17, 34000]] };
  const entity = (rows: (string | number)[][]): EntityRow[] =>
    rows.map((r) => {
      const es = Math.max(1, Math.round((r[1] as number) * kc));
      const ep = Math.round(es * period.sp);
      const ed = Math.round(ep * period.pd);
      return { name: r[0] as string, parent: (r[3] as string) || '', sent: es, paid: ep, deed: ed, fees: ep * AVG_RENT };
    });
  return { sent, paid, deed, fees, stuckSent, stuckPaid, agencies: entity(shape.agencies), branches: entity(shape.branches), referrers: entity(shape.referrers) };
}

function bands(total: number, shares: [number, number]): [number, number, number] {
  const a = Math.round(total * shares[0]);
  const b = Math.round(total * shares[1]);
  return [a, b, Math.max(0, total - a - b)];
}

function scopeLabel(role: Role): string {
  const sc = scopeFor(role);
  return sc === ALL_PARTNERS ? 'All partners (combined)' : partnerName(sc);
}

/** Performance ("Export summary") — for the selected period and partner scope. */
export function buildPerformanceCsv(role: Role, period: Period): { csv: string; filename: string } {
  const m = exportModel(role, period);
  const rng = periodRange(period);
  const rows: CsvRow[] = [];

  rows.push(['opndoor Guarantee Referral Portal — performance export']);
  rows.push(['Generated', new Date().toLocaleString('en-GB')]);
  rows.push(['Period', `${period.label} — ${dmy(rng[0])} to ${dmy(rng[1])}`]);
  rows.push(['Scope', role === 'referrer' ? 'Your referrals only' : 'Whole estate']);
  rows.push(['Partner', scopeLabel(role)]);
  rows.push(['Currency', 'GBP']);
  rows.push([]);

  rows.push(['Summary']);
  rows.push(['Metric', 'Value']);
  rows.push(['Referrals sent', m.sent]);
  rows.push(['Referrals paid', m.paid]);
  rows.push(['Deeds issued', m.deed]);
  rows.push(['Conversion: Sent to Paid', pct(m.paid, m.sent)]);
  rows.push(['Conversion: Paid to Deed', pct(m.deed, m.paid)]);
  rows.push(['Conversion: Sent to Deed', pct(m.deed, m.sent)]);
  rows.push(['Total guaranteed rent value', gbp(m.deed * ANNUAL)]);
  rows.push(['Guarantor fees collected', gbp(m.fees)]);
  const xrates = getRatesFor(scopeFor(role));
  rows.push([`Partner commission (${Math.round(xrates.partner * 100)}% of one month rent)`, gbp(m.fees * xrates.partner)]);
  rows.push([`Agent commission (${Math.round(xrates.agent * 100)}% of one month rent)`, gbp(m.fees * xrates.agent)]);
  rows.push(['Average monthly rent', gbp(AVG_RENT)]);
  rows.push(['Average guarantor fee', gbp(m.paid ? m.fees / m.paid : 0)]);
  rows.push(['Total deeds issued', m.deed]);
  rows.push(['Total value of deeds issued', gbp(m.deed * ANNUAL)]);
  rows.push([]);

  const sB = bands(m.stuckSent, [0.55, 0.3]);
  const pB = bands(m.stuckPaid, [0.5, 0.33]);
  rows.push(['Stuck applications by age band']);
  rows.push(['Stage', '7 to 14 days', '14 to 30 days', '30+ days', 'Total']);
  rows.push(['Stuck at Sent (awaiting payment)', sB[0], sB[1], sB[2], m.stuckSent]);
  rows.push(['Stuck at Paid (awaiting deed)', pB[0], pB[1], pB[2], m.stuckPaid]);
  rows.push([]);

  const breakdown = (title: string, list: EntityRow[], showParent: boolean): void => {
    rows.push([title]);
    rows.push(
      showParent
        ? ['Branch', 'Parent agency', 'Referrals', 'Fees collected (GBP)', 'Sent', 'Paid', 'Deed issued', 'Sent to Deed']
        : [title.indexOf('agency') > -1 ? 'Agency' : 'Referrer', 'Referrals', 'Fees collected (GBP)', 'Sent', 'Paid', 'Deed issued', 'Sent to Deed'],
    );
    list.forEach((e) => {
      if (showParent) rows.push([e.name, e.parent, e.sent, gbp(e.fees), e.sent, e.paid, e.deed, pct(e.deed, e.sent)]);
      else rows.push([e.name, e.sent, gbp(e.fees), e.sent, e.paid, e.deed, pct(e.deed, e.sent)]);
    });
    rows.push([]);
  };
  if (role !== 'referrer') breakdown('Breakdown by agency', m.agencies, false);
  breakdown('Breakdown by branch', m.branches, true);
  breakdown(role === 'referrer' ? 'Breakdown by month' : 'Breakdown by referrer', m.referrers, false);

  rows.push(['Monthly trend (last 12 months)']);
  rows.push(['Month', 'Referrals', 'Fees collected (GBP)', 'Deeds issued']);
  TREND_MONTHS.forEach((t) => {
    const paid = Math.round(t[1] * 0.78);
    rows.push([t[0], t[1], gbp(paid * AVG_RENT), Math.round(paid * 0.9)]);
  });

  return { csv: toCSV(rows), filename: `opndoor-performance-${period.id}-${new Date().toISOString().slice(0, 10)}.csv` };
}

interface SynthApp {
  ref: string;
  agency: string;
  branch: string;
  referrer: string;
  status: 'sent' | 'paid' | 'deed';
  sent: Date;
  paid: Date | null;
  deed: Date | null;
  rent: number;
  tStart: Date;
  expiry: Date | null;
}

function generateApplications(period: Period): SynthApp[] {
  const [start, end] = periodRange(period);
  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY));
  const N = period.fSent;
  const paidN = Math.round(N * period.sp);
  const deedN = Math.round(paidN * period.pd);
  const apps: SynthApp[] = [];
  for (let i = 0; i < N; i++) {
    const status: SynthApp['status'] = i < deedN ? 'deed' : i < paidN ? 'paid' : 'sent';
    const b = APP_BRANCHES[i % APP_BRANCHES.length];
    const sent = addDays(start, Math.floor(((i + 0.5) / N) * spanDays));
    const paid = status !== 'sent' ? addDays(sent, 3 + (i % 4)) : null;
    const deed = status === 'deed' && paid ? addDays(paid, 1 + (i % 3)) : null;
    const rent = APP_RENTS[(i * 7) % APP_RENTS.length];
    const tStart = addDays(sent, 14 + (i % 10));
    const expiry = deed ? new Date(deed.getFullYear() + 1, deed.getMonth(), deed.getDate()) : null;
    apps.push({ ref: `GR-${31000 + i}`, agency: b[1], branch: b[0], referrer: APP_REFERRERS[(i * 3) % APP_REFERRERS.length], status, sent, paid, deed, rent, tStart, expiry });
  }
  return apps;
}

/** Application-level (pseudonymised) export. Blocked for referrers. */
export function buildApplicationCsv(role: Role, period: Period): { csv: string; filename: string } | null {
  if (role === 'referrer') return null; // never for referrers
  const rng = periodRange(period);
  const apps = generateApplications(period);
  const STATUS: Record<SynthApp['status'], string> = { sent: 'Sent', paid: 'Paid', deed: 'Deed Issued' };
  const rows: CsvRow[] = [];
  rows.push(['opndoor Guarantee Referral Portal — application-level export']);
  rows.push(['Generated', new Date().toLocaleString('en-GB')]);
  rows.push(['Period', `${period.label} — ${dmy(rng[0])} to ${dmy(rng[1])} (by referral sent date)`]);
  rows.push(['Scope', 'Whole estate']);
  rows.push(['Partner', scopeLabel(role)]);
  rows.push(['Applications', `${apps.length} (equals Referrals sent in the performance export for this period)`]);
  rows.push(['Note', 'Pseudonymised by guarantee reference. No tenant names or contact details are included.']);
  rows.push(['Currency', 'GBP']);
  rows.push([]);
  rows.push(['Guarantee reference', 'Agency', 'Branch', 'Referrer', 'Status', 'Sent date', 'Paid date', 'Deed issued date', 'Monthly rent (GBP)', 'Guarantor fee (GBP)', 'Tenancy start date', 'Expiry date']);
  apps.forEach((a) => {
    rows.push([a.ref, a.agency, a.branch, a.referrer, STATUS[a.status], dmy(a.sent), a.paid ? dmy(a.paid) : '', a.deed ? dmy(a.deed) : '', gbp(a.rent), gbp(a.rent), dmy(a.tStart), a.expiry ? dmy(a.expiry) : '']);
  });
  return { csv: toCSV(rows), filename: `opndoor-applications-${period.id}-${new Date().toISOString().slice(0, 10)}.csv` };
}

function bxIssuedCount(y: number, m0: number): number {
  const seed = y * 12 + m0;
  return 58 + ((seed * 37) % 53);
}

/** Monthly underwriter bordereau (C&C format). opndoor-admin only; full tenant PII. */
export function buildBordereauCsv(role: Role, year: number, m0: number, insuranceRate: number): { csv: string; filename: string } | null {
  if (role !== 'superadmin') return null; // strictly gated: blocked even if triggered
  const ratePct = `${insuranceRate}%`;
  const N = bxIssuedCount(year, m0);
  const daysInMonth = new Date(year, m0 + 1, 0).getDate();
  const rows: CsvRow[] = [];
  rows.push(['opndoor Guarantee Referral Portal — underwriter bordereau (C&C format)']);
  rows.push(['Generated', new Date().toLocaleString('en-GB')]);
  rows.push(['Month', `${MONTH_NAMES[m0]} ${year} (by guarantee issue date)`]);
  rows.push(['Scope', 'All partners (opndoor whole book). Partner shown per row.']);
  rows.push(['Guarantees issued', N]);
  rows.push(['Insurance rate applied', ratePct]);
  rows.push(['Currency', 'GBP']);
  rows.push(['Confidential', 'Contains full tenant personal data. For the underwriter only.']);
  rows.push([]);
  rows.push(['Partner', 'Guarantee Reference', 'Tenant Title', 'First Name', 'Last Name', 'DOB', 'Tenant Role', 'Property Address 1', 'Property Address 2', 'City/Town', 'County', 'Postcode', 'Claim Contact (Agent)', 'Issue Date', 'Tenancy Date', 'Guarantee Expiry', 'Monthly Rent', 'Insurance %', 'Status']);
  for (let i = 0; i < N; i++) {
    const issueDay = 1 + Math.floor((i / N) * (daysInMonth - 1));
    const issue = new Date(year, m0, issueDay);
    const tenancy = addDays(issue, 4 + (i % 14));
    const expiry = new Date(tenancy.getFullYear() + 1, tenancy.getMonth(), tenancy.getDate());
    const dobYear = 1990 + ((i * 5) % 16);
    const dob = new Date(dobYear, (i * 7) % 12, ((i * 11) % 27) + 1);
    const st = BX_STREETS[(i * 3) % BX_STREETS.length];
    const b = APP_BRANCHES[i % APP_BRANCHES.length];
    const refNo = 40000 + (year * 12 + m0) * 200 + i;
    const partner = i % 7 === 0 ? 'Zoopla' : i % 11 === 0 ? 'OnTheMarket' : 'Rightmove';
    const flat = BX_FLATS[i % BX_FLATS.length];
    rows.push([
      partner, `GR-${refNo}`, BX_TITLES[i % BX_TITLES.length], BX_FIRST[(i * 5) % BX_FIRST.length], BX_LAST[(i * 3) % BX_LAST.length],
      dmy(dob), 'Tenant', (flat ? `${flat}, ` : '') + st[0], '', 'London', 'Greater London', st[1], b[1],
      dmy(issue), dmy(tenancy), dmy(expiry), gbp(APP_RENTS[(i * 7) % APP_RENTS.length]), ratePct, 'Deed Issued',
    ]);
  }
  return { csv: toCSV(rows), filename: `opndoor-bordereau-${year}-${pad(m0 + 1)}.csv` };
}
