/* =====================================================================
   Users — manage partner staff, or the opndoor team (?team=opndoor).
   opndoor admin accounts never appear in a partner list; the opndoor team
   view lists only opndoor staff; Management sees only its own partner.
   Add user, edit role, and per-row actions (reset password / 2FA, resend
   invite, deactivate). Reachable by opndoor admin + Management (guard).
   ===================================================================== */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  addUser, deactivateUser, emailOf, getPartner, getPartners, getUsers, homePartner, partnerName,
  updateUserRole, userPartnerName, type ManagedUser, type Role,
} from '@/data';
import { ALL_PARTNERS } from '@/data';
import { useSession } from '@/session/SessionContext';
import { usePageMeta } from '@/components/layout/pageMeta';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card, CardHead } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Pill } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import './UserManagement.css';

const ROLE_META: Record<Role, [string, string]> = {
  superadmin: ['opndoor admin', 'role-tag--super'],
  management: ['Management', 'role-tag--mgmt'],
  referrer: ['Referrer', 'role-tag--ref'],
};

interface RoleOption {
  id: Role;
  name: string;
  desc: string;
}
const ROLE_OPTIONS: RoleOption[] = [
  { id: 'superadmin', name: 'opndoor admin (Super-admin)', desc: "opndoor's internal admin. Full control of the portal: manages agencies, branches and users, syncs with HubSpot, edits help resources, and sees every referral." },
  { id: 'management', name: 'Management', desc: 'Partner management and admin. The same screens and tools as a referrer, but across the whole estate with full visibility of all tracking and analytics. Cannot edit agency and branch records or portal settings.' },
  { id: 'referrer', name: 'Referrer', desc: 'Sees and tracks only their own referrals. Can add agencies and branches on the fly while referring.' },
];

const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('');

function RoleOptions({ options, selected, onSelect, showSuperadmin }: { options: RoleOption[]; selected: Role; onSelect: (r: Role) => void; showSuperadmin: boolean }) {
  return (
    <div className="roleopts">
      {options.map((o) => {
        if (o.id === 'superadmin' && !showSuperadmin) return null;
        return (
          <label key={o.id} className={`roleopt${selected === o.id ? ' is-sel' : ''}`} onClick={() => onSelect(o.id)}>
            <span className="roleopt__radio" />
            <div><div className="roleopt__name">{o.name}</div><div className="roleopt__desc">{o.desc}</div></div>
          </label>
        );
      })}
    </div>
  );
}

export function UserManagement() {
  const { role, selectedPartner, setSelectedPartner } = useSession();
  const toast = useToast();
  const [params] = useSearchParams();
  const partnerParam = params.get('partner');
  const teamMode = params.get('team') === 'opndoor' && role === 'superadmin';

  usePageMeta(teamMode ? 'opteam' : 'users', 'Users', ['Home', 'Administration', 'Users']);

  // Drill-in from Partners: ?partner=<id> scopes this view.
  useEffect(() => {
    if (partnerParam && getPartner(partnerParam)) setSelectedPartner(partnerParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerParam]);

  const [, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // add-user modal
  const [addOpen, setAddOpen] = useState(false);
  const [addFirst, setAddFirst] = useState('');
  const [addLast, setAddLast] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<Role>('referrer');
  const [addPartnerId, setAddPartnerId] = useState('');
  // edit-role modal
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editRole, setEditRole] = useState<Role>('referrer');

  useEffect(() => {
    const close = () => setMenuOpenId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const users = getUsers({ viewer: role, team: teamMode, scope: selectedPartner });
  const showPartner = role === 'superadmin' && !teamMode;

  // ---- role-aware framing ----
  let eyebrow = 'Administration · opndoor admin';
  let sub = 'Partner staff by partner. Drill into a partner from the Partners screen, or view all partners at once here.';
  let cardTitle = selectedPartner === ALL_PARTNERS ? 'All partner users' : `${partnerName(selectedPartner)} users`;
  let cardSub = selectedPartner === ALL_PARTNERS ? 'Every partner, with a Partner column' : 'Users for this partner';
  if (teamMode) {
    eyebrow = 'opndoor · internal team';
    sub = 'opndoor’s own admin staff. They sit above all partners and never appear in a partner’s user list.';
    cardTitle = 'opndoor team';
    cardSub = 'opndoor admin staff only';
  } else if (role === 'management') {
    eyebrow = 'Administration · Management';
    sub = 'Your team’s access to the portal. Add colleagues as Management or Referrer; opndoor admin accounts are managed by opndoor.';
    cardTitle = 'All users';
    cardSub = 'Your partner team';
  }

  // ---- actions ----
  function handleAction(action: string, u: ManagedUser) {
    if (action === 'edit-role') {
      setEditUser(u);
      setEditRole(u.role);
      return;
    }
    if (action === 'reset-password') toast(`Password reset link sent to ${emailOf(u.name)}`);
    else if (action === 'reset-2fa') toast(`Two-factor authentication reset for ${u.name}. They will set it up again at next sign in.`);
    else if (action === 'resend') toast(`Invite resent to ${emailOf(u.name)}`);
    else if (action === 'deactivate') {
      deactivateUser(u.id);
      refresh();
      toast(`${u.name} has been deactivated and can no longer sign in.`);
    }
  }

  function openAdd() {
    setAddFirst('');
    setAddLast('');
    setAddEmail('');
    setAddRole(teamMode ? 'superadmin' : 'referrer');
    setAddPartnerId(selectedPartner !== ALL_PARTNERS ? selectedPartner : homePartner());
    setAddOpen(true);
  }
  function sendInvite() {
    const rec = addUser({ firstName: addFirst.trim(), lastName: addLast.trim(), email: addEmail.trim(), role: addRole, partner: addPartnerId });
    refresh();
    setAddOpen(false);
    toast(`${rec.name} invited as ${ROLE_META[addRole][0]}${addRole === 'superadmin' ? '' : ` at ${partnerName(rec.partner)}`}.`);
  }
  function saveRole() {
    if (!editUser) return;
    updateUserRole(editUser.id, editRole);
    refresh();
    const name = editUser.name;
    setEditUser(null);
    toast(`${name}’s role updated to ${ROLE_META[editRole][0]}.`);
  }

  const addOptions = teamMode ? ROLE_OPTIONS.filter((o) => o.id === 'superadmin') : ROLE_OPTIONS.filter((o) => o.id !== 'superadmin');

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="eyebrow__dot" /><span>{eyebrow}</span></div>
          <h1 className="page-head__title" style={{ marginTop: 10 }}>Users</h1>
          <p className="page-head__sub">{sub}</p>
        </div>
        <div className="page-head__actions">
          <Button variant="primary" size="sm" onClick={openAdd}><Icon name="plus" /> Add user</Button>
        </div>
      </div>

      {/* role legend */}
      <div className="toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        {teamMode && <span className="role-tag role-tag--super">opndoor admin · full control</span>}
        <span className="role-tag role-tag--mgmt">Management · full estate, no opndoor admin</span>
        <span className="role-tag role-tag--ref">Referrer · own referrals only</span>
      </div>

      <Card>
        <CardHead
          title={cardTitle}
          sub={cardSub}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {showPartner && (
                <span className="users-chip">
                  <Icon name="shield" />Partner:{' '}
                  <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)}>
                    <option value={ALL_PARTNERS}>All partners</option>
                    {getPartners().map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </span>
              )}
              <div className="users-search">
                <Icon name="search" />
                <input type="text" placeholder="Search users" />
              </div>
            </div>
          }
        />
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>User</th>
                {showPartner && <th>Partner</th>}
                <th>Role</th>
                <th>Last active</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const rm = ROLE_META[u.role];
                const isPending = u.status !== 'active';
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="who">
                        <span className="who__av">{initials(u.name)}</span>
                        <div><div className="dt__name">{u.name}</div><div className="dt__sub">{emailOf(u.name)}</div></div>
                      </div>
                    </td>
                    {showPartner && <td className="soft">{userPartnerName(u.partner)}</td>}
                    <td><span className={`role-tag ${rm[1]}`}>{rm[0]}</span></td>
                    <td className="soft">{u.lastActive}</td>
                    <td>{u.status === 'active' ? <Pill variant="deed">Active</Pill> : <Pill variant="warn">Pending</Pill>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={`rowmenu${menuOpenId === u.id ? ' is-open' : ''}`}>
                        <button
                          className="rowmenu__btn"
                          aria-label="User actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId((cur) => (cur === u.id ? null : u.id));
                          }}
                        >
                          <Icon name="dots" size={16} />
                        </button>
                        <div className="rowmenu__pop">
                          <button className="rowmenu__item" onClick={() => { setMenuOpenId(null); handleAction('edit-role', u); }}><Icon name="edit" />Edit role</button>
                          <button className="rowmenu__item" onClick={() => { setMenuOpenId(null); handleAction('reset-password', u); }}><Icon name="lock" />Reset password</button>
                          <button className="rowmenu__item" onClick={() => { setMenuOpenId(null); handleAction('reset-2fa', u); }}><Icon name="phone" />Reset 2FA</button>
                          <div className="rowmenu__sep" />
                          {isPending ? (
                            <button className="rowmenu__item" onClick={() => { setMenuOpenId(null); handleAction('resend', u); }}><Icon name="send" />Resend invite</button>
                          ) : (
                            <button className="rowmenu__item rowmenu__item--danger" onClick={() => { setMenuOpenId(null); handleAction('deactivate', u); }}><Icon name="ban" />Deactivate user</button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ADD USER */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        width={560}
        title={teamMode ? 'Add opndoor team member' : 'Add user'}
        sub="Invite a partner team member and set their access level."
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={sendInvite} arrow>Send invite</Button></>}
      >
        <div className="form-grid">
          <Field label="First name"><input type="text" placeholder="James" value={addFirst} onChange={(e) => setAddFirst(e.target.value)} /></Field>
          <Field label="Last name"><input type="text" placeholder="Okafor" value={addLast} onChange={(e) => setAddLast(e.target.value)} /></Field>
          <Field label="Work email" span2><input type="email" placeholder="james@brackenhouse.co.uk" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} /></Field>
          {addRole !== 'superadmin' && (
            <Field label="Partner company" span2 hint="opndoor admin users sit above all partners and do not belong to one.">
              <select value={addPartnerId} onChange={(e) => setAddPartnerId(e.target.value)}>
                {getPartners().map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        <Field label="Role">
          <RoleOptions options={addOptions} selected={addRole} onSelect={setAddRole} showSuperadmin={teamMode} />
        </Field>
      </Modal>

      {/* EDIT ROLE */}
      <Modal
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title={<>Edit role · {editUser?.name ?? 'User'}</>}
        sub={editUser ? emailOf(editUser.name) : ''}
        footer={<><Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button><Button variant="primary" onClick={saveRole}>Save role</Button></>}
      >
        <Field label="Role">
          <RoleOptions options={ROLE_OPTIONS} selected={editRole} onSelect={setEditRole} showSuperadmin={role === 'superadmin'} />
        </Field>
      </Modal>
    </>
  );
}
