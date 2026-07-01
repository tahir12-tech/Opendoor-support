/* =====================================================================
   Reconciliation (opndoor admin only, enforced by the route guard).
   The queue of agencies/branches created on the fly by referrers, with a
   suggested duplicate match + confidence, the HubSpot mapping indicator, and
   two actions: confirm as new, or merge into a canonical record (which
   reassigns its referrals).

   INTEGRATION: getQueue/confirmRecord/mergeRecord + the duplicate-suggestion
   logic and HubSpot mapping live in reconciliationService.
   ===================================================================== */
import { useState } from 'react';
import { CANON_AGENCIES, CANON_BRANCHES, confirmRecord, getQueue, mergeRecord, type ReconciliationRecord } from '@/data';
import { usePageMeta } from '@/components/layout/pageMeta';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import '@/components/ui/opbar.css';
import './Reconciliation.css';

type Filter = 'all' | 'agency' | 'branch' | 'dupes';

function HubspotChip({ item }: { item: ReconciliationRecord }) {
  if (item.hs === 'synced') return <span className="hs hs--synced"><Icon name="check" strokeWidth={2.2} />HubSpot · <span className="hs__co">{item.hsCo}</span></span>;
  if (item.hs === 'pending') return <span className="hs hs--pending"><Icon name="clock" />HubSpot sync pending</span>;
  return <span className="hs hs--none"><Icon name="minus" />Not in HubSpot</span>;
}

export function Reconciliation() {
  usePageMeta('reconcile', 'Reconciliation', ['Home', 'opndoor', 'Reconciliation']);
  const toast = useToast();
  const [queue, setQueue] = useState<ReconciliationRecord[]>(() => getQueue());
  const [filter, setFilter] = useState<Filter>('all');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState<Set<string>>(new Set());
  const [mergeSel, setMergeSel] = useState<Record<string, string>>({});
  const [hsState, setHsState] = useState<'idle' | 'syncing' | 'done'>('idle');

  const dupes = queue.filter((i) => i.match).length;
  const newOnes = queue.length - dupes;
  const synced = queue.filter((i) => i.hs === 'synced').length;
  const agencyCount = queue.filter((i) => i.type === 'agency').length;
  const branchCount = queue.filter((i) => i.type === 'branch').length;

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: queue.length },
    { id: 'agency', label: 'Agencies', count: agencyCount },
    { id: 'branch', label: 'Branches', count: branchCount },
    { id: 'dupes', label: 'Possible duplicates', count: dupes },
  ];

  const passes = (item: ReconciliationRecord) => (filter === 'all' ? true : filter === 'dupes' ? !!item.match : item.type === filter);
  const visible = queue.filter(passes);

  function resolve(id: string, action: 'confirm' | 'merge', into: string, msg: string) {
    toast(msg);
    setRemovingId(id);
    setTimeout(() => {
      if (action === 'confirm') confirmRecord(id);
      else mergeRecord(id, into);
      setQueue(getQueue());
      setRemovingId(null);
    }, 240);
  }

  function toggleMerge(id: string) {
    setMergeOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectionFor(item: ReconciliationRecord): string {
    return mergeSel[item.id] ?? item.match ?? (item.type === 'agency' ? CANON_AGENCIES[0] : CANON_BRANCHES[0]);
  }

  function syncHubspot() {
    if (hsState === 'syncing') return;
    setHsState('syncing');
    setTimeout(() => {
      setHsState('done');
      setTimeout(() => setHsState('idle'), 2200);
    }, 1100);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="rec-eyebrow"><span className="opx">opndoor</span> · internal admin</div>
          <h1 className="page-head__title" style={{ marginTop: 10 }}>Reconciliation</h1>
          <p className="page-head__sub">Agencies and branches created on the fly by referrers, awaiting review. Confirm new canonical records or merge likely duplicates, and keep the hierarchy mapped cleanly to HubSpot.</p>
        </div>
        <div className="page-head__actions">
          <Button variant="ghost" size="sm" onClick={syncHubspot}>
            {hsState === 'syncing' ? 'Syncing HubSpot…' : hsState === 'done' ? <><Icon name="check" strokeWidth={2.4} /> HubSpot synced</> : <><Icon name="refresh" /> Sync HubSpot</>}
          </Button>
        </div>
      </div>

      <div className="card opbar">
        <Icon name="shield" />
        <span>Visible to <b>opndoor admins</b> only. Partner super-admins, management and referrers never see this reconciliation view.</span>
      </div>

      <div className="qstat">
        <div className="qstat__card"><div className="qstat__n">{queue.length}</div><div className="qstat__l">Awaiting review</div></div>
        <div className="qstat__card"><div className="qstat__n" style={{ color: 'var(--warn)' }}>{dupes}</div><div className="qstat__l">Possible duplicates</div></div>
        <div className="qstat__card"><div className="qstat__n" style={{ color: 'var(--heliotrope-deep)' }}>{newOnes}</div><div className="qstat__l">New, no match found</div></div>
        <div className="qstat__card"><div className="qstat__n" style={{ color: 'var(--deed)' }}>{synced}</div><div className="qstat__l">Synced to HubSpot</div></div>
      </div>

      <div className="rtabs">
        {tabs.map((t) => (
          <button key={t.id} className={`rtab${filter === t.id ? ' is-active' : ''}`} onClick={() => setFilter(t.id)}>
            {t.label} <span className="rtab__c">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="rq">
        {visible.map((item) => {
          const removing = removingId === item.id;
          const parent = item.type === 'branch' ? <>Under <b>{item.parent}</b> · </> : null;
          const canonList = item.type === 'agency' ? CANON_AGENCIES : CANON_BRANCHES;
          return (
            <div className="rqitem" key={item.id} style={removing ? { opacity: 0, transform: 'translateX(12px)' } : undefined}>
              <span className={`rqitem__ic ${item.type === 'agency' ? 'rqitem__ic--agency' : 'rqitem__ic--branch'}`}>
                <Icon name={item.type === 'agency' ? 'building' : 'home'} />
              </span>
              <div className="rqitem__main">
                <div className="rqitem__top">
                  <span className="rqitem__name">{item.name}</span>
                  {item.type === 'agency' ? <span className="tag tag--admin">New agency</span> : <span className="tag">New branch</span>}
                  <HubspotChip item={item} />
                </div>
                <div className="rqitem__meta">{parent}created by <b>{item.by}</b> · {item.when} · {item.refs} referral{item.refs === 1 ? '' : 's'} attached</div>

                {item.match ? (
                  <div className="match">
                    <span className="match__lbl">Possible duplicate</span>
                    <span className="match__txt">Looks like existing <b>{item.match}</b></span>
                    <span className="match__pct">{item.score}%</span>
                  </div>
                ) : (
                  <div className="match match--none">
                    <span className="match__lbl">No match found</span>
                    <span className="match__txt">No similar canonical record. Likely a genuinely new {item.type}.</span>
                  </div>
                )}

                <div className={`mergebox${mergeOpen.has(item.id) ? ' is-open' : ''}`}>
                  <div className="mergebox__lbl">Merge "{item.name}" into a canonical {item.type}</div>
                  <div className="mergebox__row">
                    <select value={selectionFor(item)} onChange={(e) => setMergeSel((s) => ({ ...s, [item.id]: e.target.value }))}>
                      {canonList.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => resolve(item.id, 'merge', selectionFor(item), `Merged "${item.name}" into ${selectionFor(item)}. ${item.refs} referral${item.refs === 1 ? '' : 's'} reassigned.`)}
                    >
                      Merge
                    </Button>
                  </div>
                  <div className="mergebox__hint">{item.refs} referral{item.refs === 1 ? '' : 's'} attached to "{item.name}" will be reassigned to the selected record.</div>
                </div>
              </div>

              <div className="rqitem__actions">
                <Button variant="ghost" size="sm" onClick={() => toggleMerge(item.id)}><Icon name="merge" /> Merge into…</Button>
                <Button variant="primary" size="sm" onClick={() => resolve(item.id, 'confirm', '', `Confirmed "${item.name}" as a new canonical ${item.type}. Queued for HubSpot.`)}>
                  <Icon name="check" strokeWidth={2.2} /> Confirm as new
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className={`empty${queue.length ? '' : ' is-shown'}`}>Nothing left to reconcile. The hierarchy is clean.</div>
    </>
  );
}
