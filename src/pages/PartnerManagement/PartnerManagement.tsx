/* =====================================================================
   Partners — the top of the hierarchy (opndoor admin only, enforced by the
   route guard). Lists every partner with users/agencies/branches/apps and
   status, drills into a partner's users, and onboards / amends partners
   (including their per-partner commission rates) via the add/manage modal.
   ===================================================================== */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPartner, getPartner, getPartners, orgCounts, updatePartner, type PartnerStatus } from '@/data';
import { usePageMeta } from '@/components/layout/pageMeta';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card, CardHead } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Pill, type PillVariant } from '@/components/ui/Pill';
import { Tag } from '@/components/ui/Tag';
import { useToast } from '@/components/ui/Toast';
import '@/components/ui/opbar.css';
import './PartnerManagement.css';

const STATUS_PILL: Record<PartnerStatus, [string, PillVariant]> = {
  active: ['Active', 'deed'],
  onboarding: ['Onboarding', 'warn'],
  paused: ['Paused', 'muted'],
};
const initials = (n: string) => n.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const asPct = (frac: number | undefined, fallback: number) => Math.round((frac != null ? frac : fallback) * 100);

export function PartnerManagement() {
  usePageMeta('partners', 'Partners', ['Home', 'Administration', 'Partners']);
  const navigate = useNavigate();
  const toast = useToast();
  const [, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [since, setSince] = useState('');
  const [status, setStatus] = useState<PartnerStatus>('active');
  const [partnerRate, setPartnerRate] = useState('25');
  const [agentRate, setAgentRate] = useState('10');

  const partners = getPartners();

  function openAdd() {
    setEditingId(null);
    setName('');
    setSince('');
    setStatus('active');
    setPartnerRate('25');
    setAgentRate('10');
    setOpen(true);
  }
  function openEdit(id: string) {
    const p = getPartner(id);
    if (!p) return;
    setEditingId(id);
    setName(p.name);
    setSince(p.since || '');
    setStatus(p.status || 'active');
    setPartnerRate(String(asPct(p.partnerRate, 0.25)));
    setAgentRate(String(asPct(p.agentRate, 0.1)));
    setOpen(true);
  }

  function readRate(v: string, fallback: number): number {
    const n = parseFloat(v);
    if (isNaN(n) || n < 0) return fallback;
    return Math.min(100, n) / 100;
  }

  function save() {
    if (!name.trim()) return;
    const pr = readRate(partnerRate, 0.25);
    const ar = readRate(agentRate, 0.1);
    if (editingId) {
      updatePartner(editingId, { name: name.trim(), since: since || undefined, status, partnerRate: pr, agentRate: ar });
      toast(`Updated ${name.trim()}. Commission set to ${Math.round(pr * 100)}% partner / ${Math.round(ar * 100)}% agent.`);
    } else {
      const rec = addPartner({ name: name.trim(), since: since || undefined, status, partnerRate: pr, agentRate: ar });
      toast(`Partner "${rec.name}" created at ${Math.round(pr * 100)}% partner / ${Math.round(ar * 100)}% agent. Add users, agencies and branches under it next.`);
    }
    setOpen(false);
    refresh();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="rec-eyebrow"><span className="opx">opndoor</span> · internal admin</div>
          <h1 className="page-head__title" style={{ marginTop: 10 }}>Partners</h1>
          <p className="page-head__sub">Every partner company on the portal. A partner sits at the top of the hierarchy, with its own users, agencies, branches and applications beneath it. Click a partner to manage its users.</p>
        </div>
        <div className="page-head__actions">
          <Button variant="primary" size="sm" onClick={openAdd}><Icon name="plus" /> Add partner</Button>
        </div>
      </div>

      <div className="card opbar">
        <Icon name="shield" />
        <span>Visible to <b>opndoor admins</b> only. Partners never see each other; each partner only sees its own data.</span>
      </div>

      <Card>
        <CardHead
          title="All partners"
          sub={`${partners.length} partner ${partners.length === 1 ? 'company' : 'companies'}`}
          actions={<Button variant="quiet" size="sm" to="/users" arrow>All users · all partners</Button>}
        />
        <div className="table-wrap">
          <table className="dt ptable">
            <thead>
              <tr>
                <th>Partner</th>
                <th style={{ textAlign: 'right' }}>Users</th>
                <th style={{ textAlign: 'right' }}>Agencies</th>
                <th style={{ textAlign: 'right' }}>Branches</th>
                <th style={{ textAlign: 'right' }}>Applications</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const c = orgCounts(p.id);
                const sp = STATUS_PILL[p.status] || STATUS_PILL.active;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="pco">
                        <span className="pco__logo">{initials(p.name)}</span>
                        <div>
                          <div className="pco__name">{p.name}{p.primary && <> <Tag variant="primary">Primary</Tag></>}</div>
                          <div className="pco__since">Live from {p.since || '—'} · Partner {asPct(p.partnerRate, 0.25)}% / Agent {asPct(p.agentRate, 0.1)}%</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}><span className="pnum">{p.users}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="pnum">{c.agencies}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="pnum">{c.branches}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="pnum">{p.apps.toLocaleString('en-GB')}</span></td>
                    <td><Pill variant={sp[1]}>{sp[0]}</Pill></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/users?partner=${encodeURIComponent(p.id)}`)}>Users</Button>{' '}
                      <Button variant="primary" size="sm" onClick={() => openEdit(p.id)}>Manage</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? `Manage ${getPartner(editingId)?.name ?? ''}` : 'Add partner'}
        sub={editingId ? "Adjust this partner’s details and commission. Changes apply across the dashboard and exports." : 'Onboard a new partner company. Users, agencies and branches can be added under it afterwards.'}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={save}>{editingId ? 'Save changes' : 'Create partner'}</Button></>}
      >
        <Field label="Partner company name" htmlFor="pm-name"><input id="pm-name" type="text" placeholder="e.g. PrimeLocation" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Live from" htmlFor="pm-since" hint="Optional"><input id="pm-since" type="month" value={since} onChange={(e) => setSince(e.target.value)} /></Field>
        <Field label="Status" htmlFor="pm-status">
          <select id="pm-status" value={status} onChange={(e) => setStatus(e.target.value as PartnerStatus)}>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="paused">Paused</option>
          </select>
        </Field>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 2 }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Commission</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginBottom: 12 }}>Each a share of the guarantor fee (one month's rent). Set per partner when signing or amending.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Partner commission %" htmlFor="pm-partner-rate"><input id="pm-partner-rate" type="number" step="0.5" min="0" max="100" placeholder="25" value={partnerRate} onChange={(e) => setPartnerRate(e.target.value)} /></Field>
            <Field label="Agent commission %" htmlFor="pm-agent-rate"><input id="pm-agent-rate" type="number" step="0.5" min="0" max="100" placeholder="10" value={agentRate} onChange={(e) => setAgentRate(e.target.value)} /></Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
