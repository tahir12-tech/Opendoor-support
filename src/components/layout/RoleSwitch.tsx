/* =====================================================================
   Demo role switcher (.roleswitch). Kept "for now" per the brief; it drives
   SessionContext.setRole so every screen re-renders under the new role.
   In production this is removed and the role comes from the auth session.
   ===================================================================== */
import { useSession } from '@/session/SessionContext';
import { ROLE_SWITCH } from '@/constants/roles';

export function RoleSwitch() {
  const { role, setRole } = useSession();
  return (
    <div className="roleswitch" title="Demo: switch role to see access change">
      {ROLE_SWITCH.map((r) => (
        <button key={r.id} className={`roleswitch__btn${r.id === role ? ' is-active' : ''}`} onClick={() => setRole(r.id)}>
          {r.label}
        </button>
      ))}
    </div>
  );
}
