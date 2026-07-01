/* =====================================================================
   Sidebar — brand, product label, role-filtered navigation, and the
   signed-in user footer. Ported from portal.js buildSidebar. The
   reconciliation badge count comes from the queue.
   ===================================================================== */
import { Link } from 'react-router-dom';
import { getQueue } from '@/data';
import { useSession } from '@/session/SessionContext';
import { NAV } from '@/constants/nav';
import { usePageMetaValue } from './pageMeta';
import { Icon } from '@/components/ui/Icon';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role, user } = useSession();
  const { active } = usePageMetaValue();
  const reconcileBadge = getQueue().length;

  return (
    <>
      <div className="sb__brand">
        <span className="wordmark">opndoor</span>
        <span className="sb__cobrand">
          Partner<br />portal
        </span>
      </div>
      <div className="sb__product">
        <div className="sb__product-tag">Guarantee</div>
        <div className="sb__product-name">Referral Portal</div>
      </div>

      <nav className="sb__nav">
        {NAV.map((grp) => {
          const items = grp.items.filter((it) => it.roles.includes(role));
          if (!items.length) return null;
          return (
            <div className="sb__group" key={grp.group}>
              <div className="sb__group-label">{grp.group}</div>
              {items.map((it) => {
                const badge = it.badge === 'reconcile' ? reconcileBadge : undefined;
                return (
                  <Link key={it.id} className={`sb__link${active === it.id ? ' is-active' : ''}`} to={it.to} onClick={onNavigate}>
                    <Icon name={it.icon} />
                    <span>{it.label}</span>
                    {badge ? <span className="sb__link-badge">{badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sb__foot">
        <div className="sb__user">
          <span className="sb__avatar">{user.initials}</span>
          <div>
            <div className="sb__user-name">{user.name}</div>
            <div className="sb__user-role">{user.label}</div>
          </div>
        </div>
      </div>
    </>
  );
}
