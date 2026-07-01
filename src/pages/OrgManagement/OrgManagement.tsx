/* =====================================================================
   Agencies & branches — the partner organisation hierarchy. Expandable
   agencies, live search with highlighting, drill-through figures to the
   applications behind them, the add-agency/add-branch modals, the
   Management-only commission columns (per-partner rates), and the opndoor
   admin partner selector. View for all roles; canonical editing is admin.
   ===================================================================== */
import { useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ALL_PARTNERS, addAgency, addBranch, getAgencies, getPartners, getRatesFor,
  type Agency, type Branch,
} from '@/data';
import { useSession } from '@/session/SessionContext';
import { usePageMeta } from '@/components/layout/pageMeta';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PartnerSelect } from '@/components/ui/Select';
import './OrgManagement.css';

const agencyId = (a: Agency) => `${a.partner || 'rightmove'}:${a.name}`;

function highlight(name: string, q: string): ReactNode {
  if (!q) return name;
  const i = name.toLowerCase().indexOf(q);
  if (i === -1) return name;
  return (
    <>
      {name.slice(0, i)}
      <mark className="hl">{name.slice(i, i + q.length)}</mark>
      {name.slice(i + q.length)}
    </>
  );
}

function feesOf(item: Agency | Branch, isAgency: boolean): number {
  if (item.fees != null) return item.fees;
  if (isAgency && (item as Agency).branches) return (item as Agency).branches.reduce((s, b) => s + feesOf(b, false), 0);
  return Math.round((item.referrals || 0) * 0.78 * 2180);
}
function fmtK(n: number): string {
  if (n >= 1e6) return `£${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `£${Math.round(n / 1e3)}k`;
  return `£${Math.round(n)}`;
}

const goIcon = <span className="statlink__go"><Icon name="arrowRight" strokeWidth={2.2} /></span>;

export function OrgManagement() {
  usePageMeta('org', 'Agencies & branches', ['Home', 'Administration', 'Agencies & branches']);
  const { role, partnerScope, selectedPartner, setSelectedPartner } = useSession();

  const [, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  const [query, setQuery] = useState('');
  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set(getAgencies(ALL_PARTNERS).filter((a) => a.open).map(agencyId)));

  // add-agency modal
  const [agencyOpen, setAgencyOpen] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [agencyGroup, setAgencyGroup] = useState('');
  // add-branch modal
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchArea, setBranchArea] = useState('');
  const [branchAgency, setBranchAgency] = useState('');

  const rates = getRatesFor(partnerScope);
  const isMgmt = role === 'management';
  const q = query.trim().toLowerCase();
  const pool = getAgencies(partnerScope);

  const partnerPoolForBranch = getAgencies(partnerScope);

  function toggle(id: string) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onHeadClick(e: MouseEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest('.statlink') || target.closest('[data-stop]')) return;
    toggle(id);
  }

  function saveAgency() {
    if (!agencyName.trim()) return;
    addAgency({ name: agencyName.trim(), group: agencyGroup.trim() || undefined }, partnerScope);
    setAgencyOpen(false);
    refresh();
  }
  function openAddBranch(name?: string) {
    setBranchName('');
    setBranchArea('');
    setBranchAgency(name || partnerPoolForBranch[0]?.name || '');
    setBranchOpen(true);
  }
  function saveBranch() {
    if (!branchName.trim() || !branchAgency) return;
    addBranch(branchAgency, { name: branchName.trim(), area: branchArea.trim() || undefined });
    setBranchOpen(false);
    refresh();
  }

  const eyebrow = role === 'superadmin' ? 'opndoor admin' : role === 'management' ? 'Management' : 'Organisation';
  const roleNote: ReactNode =
    role === 'superadmin' ? <>As an <b>opndoor admin</b> you have full control: add, edit and reorganise agencies and branches, and sync the hierarchy with HubSpot.</>
      : role === 'management' ? <>You can view every agency and branch across the estate and add new ones on the fly. Editing existing records and HubSpot sync are handled by <b>opndoor</b>.</>
        : <>You can view every agency and branch and add new ones on the fly. Editing existing records is handled by <b>opndoor</b>.</>;

  // Filtered, with expand-all while searching (mirrors org-management.html).
  const shownAgencies = pool
    .map((a) => {
      const agencyMatch = a.name.toLowerCase().includes(q);
      const branches = a.branches.filter((b) => !q || agencyMatch || b.name.toLowerCase().includes(q));
      return { a, agencyMatch, branches };
    })
    .filter(({ agencyMatch, branches }) => !(q && !agencyMatch && branches.length === 0));

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="page-head__title" style={{ marginTop: 10 }}>Agencies &amp; branches</h1>
          <p className="page-head__sub">Manage the partner organisation hierarchy. Search to find an agency or branch, expand to see branches, or click any figure to view the applications behind it.</p>
        </div>
        <div className="page-head__actions">
          {role === 'superadmin' && (
            <PartnerSelect
              ariaLabel="Partner"
              value={selectedPartner}
              onChange={setSelectedPartner}
              options={[{ value: ALL_PARTNERS, label: 'All partners' }, ...getPartners().map((p) => ({ value: p.id, label: p.name }))]}
            />
          )}
          <Button variant="ghost" size="sm"><Icon name="download" /> Export</Button>
          <Button variant="primary" size="sm" onClick={() => { setAgencyName(''); setAgencyGroup(''); setAgencyOpen(true); }}><Icon name="plus" /> Add agency</Button>
        </div>
      </div>

      <div className="rolenote" style={{ marginBottom: 18 }}>
        <Icon name="shield" />
        <span>{roleNote}</span>
      </div>

      <div className={`org-search${query.trim() ? ' has-q' : ''}`}>
        <Icon name="search" />
        <input type="text" placeholder="Search agencies or branches" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="org-search__clear" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="x" size={16} /></button>
      </div>

      <div className="org">
        {shownAgencies.map(({ a, branches }) => {
          const id = agencyId(a);
          const open = q ? true : openSet.has(id);
          const fees = feesOf(a, true);
          const meta = `${a.group ? `${a.group} · ` : ''}${a.branches.length} ${a.branches.length === 1 ? 'branch' : 'branches'}`;
          return (
            <div className={`agency${open ? ' is-open' : ''}`} key={id}>
              <div className="agency__head" onClick={(e) => onHeadClick(e, id)}>
                <span className="agency__chev"><Icon name="chevronRight" size={18} strokeWidth={2.2} /></span>
                <span className="agency__ic"><Icon name="org" /></span>
                <div className="agency__txt">
                  <div className="agency__name">{highlight(a.name, q)}</div>
                  <div className="agency__meta">{meta}</div>
                </div>
                <Link className="statlink statlink--agency" to={`/applications?agency=${encodeURIComponent(a.name)}`} title={`View all applications for ${a.name}`}>
                  <div className="agency__stat"><div className="n">{a.referrals}</div><div className="l">Referrals</div></div>
                  <div className="agency__stat"><div className="n">{fmtK(fees)}</div><div className="l">Fees collected</div></div>
                  {isMgmt && <div className="agency__stat"><div className="n">{fmtK(fees * rates.partner)}</div><div className="l">Your commission</div></div>}
                  {isMgmt && <div className="agency__stat"><div className="n">{fmtK(fees * rates.agent)}</div><div className="l">Agent comm.</div></div>}
                  {goIcon}
                </Link>
                {role === 'superadmin' && (
                  <div className="agency__actions" data-stop>
                    <button className="iconbtn iconbtn--sm" title="Edit"><Icon name="edit" /></button>
                  </div>
                )}
              </div>
              <div className="branches">
                {branches.map((b) => {
                  const bFees = feesOf(b, false);
                  return (
                    <div className="branch" key={b.name}>
                      <span className="branch__line">│</span>
                      <span className="branch__ic"><Icon name="home" /></span>
                      <div className="branch__txt">
                        <div className="branch__name">{highlight(b.name, q)}</div>
                        <div className="branch__meta">{b.area}</div>
                      </div>
                      <Link className="statlink statlink--branch" to={`/applications?branch=${encodeURIComponent(b.name)}`} title={`View applications for ${b.name}`}>
                        <div className="branch__stat"><b>{b.referrals}</b>referrals</div>
                        <div className="branch__stat"><b>{fmtK(bFees)}</b>fees collected</div>
                        {isMgmt && <div className="branch__stat"><b>{fmtK(bFees * rates.partner)}</b>your comm.</div>}
                        {isMgmt && <div className="branch__stat"><b>{fmtK(bFees * rates.agent)}</b>agent comm.</div>}
                        {goIcon}
                      </Link>
                    </div>
                  );
                })}
                {!q && (
                  <div className="branch__add">
                    <Button variant="ghost" size="sm" onClick={() => openAddBranch(a.name)}><Icon name="plus" /> Add branch</Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`org-empty${shownAgencies.length ? '' : ' is-shown'}`}>No agencies or branches match your search.</div>

      {/* ADD AGENCY */}
      <Modal
        open={agencyOpen}
        onClose={() => setAgencyOpen(false)}
        title="Add agency"
        sub="Create a new agency in the hierarchy. Branches can be added to it afterwards."
        footer={<><Button variant="ghost" onClick={() => setAgencyOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveAgency}>Save agency</Button></>}
      >
        <Field label="Agency name" htmlFor="agency-name"><input id="agency-name" type="text" placeholder="e.g. Riverside Lettings" autoComplete="off" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} /></Field>
        <Field label="Group / network" htmlFor="agency-group" hint="Optional"><input id="agency-group" type="text" placeholder="e.g. ABC group" autoComplete="off" value={agencyGroup} onChange={(e) => setAgencyGroup(e.target.value)} /></Field>
      </Modal>

      {/* ADD BRANCH */}
      <Modal
        open={branchOpen}
        onClose={() => setBranchOpen(false)}
        title="Add branch"
        sub="Add a branch to an agency in the hierarchy."
        footer={<><Button variant="ghost" onClick={() => setBranchOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveBranch}>Save branch</Button></>}
      >
        <Field label="Branch name" htmlFor="branch-name"><input id="branch-name" type="text" placeholder="e.g. Notting Hill" autoComplete="off" value={branchName} onChange={(e) => setBranchName(e.target.value)} /></Field>
        <Field label="Postcode / area" htmlFor="branch-area"><input id="branch-area" type="text" placeholder="e.g. W11" autoComplete="off" value={branchArea} onChange={(e) => setBranchArea(e.target.value)} /></Field>
        <Field label="Parent agency" htmlFor="branch-agency">
          <select id="branch-agency" value={branchAgency} onChange={(e) => setBranchAgency(e.target.value)}>
            {partnerPoolForBranch.map((a) => <option key={agencyId(a)} value={a.name}>{a.name}</option>)}
          </select>
        </Field>
      </Modal>
    </>
  );
}
