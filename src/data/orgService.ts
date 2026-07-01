/* =====================================================================
   Organisation service — agencies + branches.
   Backed by a working copy persisted to localStorage so additions made on
   the new-application form appear on the Agencies & branches screen and
   vice versa.

   INTEGRATION: getAgencies -> GET /agencies?partner=; search* -> scoped
   search endpoints; createAgency/BranchOnTheFly -> POST that returns the
   new id and FLAGS the record for reconciliation (unreviewed = true).
   ===================================================================== */
import type { Agency, Branch, PartnerScope } from './types';
import { ALL_PARTNERS } from './types';
import { KEYS, clone, loadJSON, saveJSON } from './storage';
import { ORG_SEED } from './mock/org';
import { HOME_PARTNER } from './mock/partners';

let AGENCIES: Agency[] = loadJSON<Agency[]>(KEYS.org, clone(ORG_SEED));
if (!AGENCIES.length) AGENCIES = clone(ORG_SEED);

function persist(): void {
  saveJSON(KEYS.org, AGENCIES);
}

function partnerOf(a: Agency): string {
  return a.partner || HOME_PARTNER;
}

/** All agencies within a partner scope ("all" returns every partner's agencies). */
export function getAgencies(scope: PartnerScope): Agency[] {
  if (scope === ALL_PARTNERS) return AGENCIES.slice();
  return AGENCIES.filter((a) => partnerOf(a) === scope);
}

export function findAgency(name: string): Agency | undefined {
  return AGENCIES.find((a) => a.name === name);
}

/** Type-ahead: agencies within scope whose name matches the query. */
export function searchAgencies(query: string, scope: PartnerScope): Agency[] {
  const ql = query.trim().toLowerCase();
  return getAgencies(scope).filter((a) => !ql || a.name.toLowerCase().includes(ql));
}

/** Type-ahead: branches of an agency whose name matches the query. */
export function searchBranches(agencyName: string, query: string): Branch[] {
  const agency = findAgency(agencyName);
  if (!agency) return [];
  const ql = query.trim().toLowerCase();
  return agency.branches.filter((b) => !ql || b.name.toLowerCase().includes(ql));
}

export interface AddAgencyInput {
  name: string;
  group?: string;
}

/** Add an agency from the Agencies & branches screen (stamped to the active partner). */
export function addAgency(input: AddAgencyInput, scope: PartnerScope): Agency {
  const partner = scope === ALL_PARTNERS ? HOME_PARTNER : scope;
  const agency: Agency = { name: input.name, partner, users: 0, referrals: 0, guaranteed: '£0', fees: 0, open: true, branches: [] };
  if (input.group) agency.group = input.group;
  AGENCIES.push(agency);
  persist();
  return agency;
}

export interface AddBranchInput {
  name: string;
  area?: string;
}

export function addBranch(agencyName: string, input: AddBranchInput): Branch | null {
  const agency = findAgency(agencyName);
  if (!agency) return null;
  const branch: Branch = { name: input.name, area: input.area || '—', referrers: 0, referrals: 0, guaranteed: '£0' };
  agency.branches.push(branch);
  agency.open = true;
  persist();
  return branch;
}

/** Create an agency on the fly from the referral form. Flagged unreviewed for reconciliation. */
export function createAgencyOnTheFly(name: string, scope: PartnerScope): Agency {
  const partner = scope === ALL_PARTNERS ? HOME_PARTNER : scope;
  const agency: Agency = { name, partner, users: 0, referrals: 0, guaranteed: '£0', fees: 0, branches: [], unreviewed: true };
  AGENCIES.push(agency);
  persist();
  return agency;
}

/** Create a branch on the fly under an agency. Flagged unreviewed for reconciliation. */
export function createBranchOnTheFly(agencyName: string, name: string): Branch | null {
  const agency = findAgency(agencyName);
  if (!agency) return null;
  const branch: Branch = { name, area: '—', referrers: 0, referrals: 0, guaranteed: '£0', unreviewed: true };
  agency.branches.push(branch);
  persist();
  return branch;
}

/** Derived counts for a partner (used by the Partners screen). */
export function orgCounts(partnerId: string): { agencies: number; branches: number } {
  let agencies = 0;
  let branches = 0;
  AGENCIES.forEach((a) => {
    if (partnerOf(a) === partnerId) {
      agencies++;
      branches += a.branches ? a.branches.length : 0;
    }
  });
  return { agencies, branches };
}
