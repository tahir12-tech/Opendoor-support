/* =====================================================================
   Application detail — the full record for one application, data-driven by
   the :ref route param. Status timeline, tenant / property / agent /
   tenancy, guarantee summary, stored deed, activity feed, and the amend
   tenancy-start modal (opndoor admin + Management) with its 7-day rule.

   INTEGRATION: getApplicationDetail + amendTenancyStart are in
   applicationsService; the 7-day rule and deed reissue must be enforced
   server-side. Payment/deed generation are Stripe/PandaDoc in production.
   ===================================================================== */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AMEND_WINDOW_DAYS, amendWindow, getApplicationDetail } from '@/data';
import { useSession } from '@/session/SessionContext';
import { usePageMeta } from '@/components/layout/pageMeta';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card, CardBody, CardHead } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Pill } from '@/components/ui/Pill';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { RoleOnly } from '@/components/ui/RoleOnly';
import { useToast } from '@/components/ui/Toast';
import './ApplicationDetail.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NOW = new Date(2026, 5, 26);

const fmtLong = (x: Date) => `${x.getDate()} ${MONTHS_LONG[x.getMonth()]} ${x.getFullYear()}`;
const fmtShort = (x: Date) => `${String(x.getDate()).padStart(2, '0')} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
const fmtInput = (x: Date) => `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
const addYear = (x: Date) => new Date(x.getFullYear() + 1, x.getMonth(), x.getDate());
function parseInput(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((s || '').trim());
  if (!m) return null;
  const x = new Date(+m[3], +m[2] - 1, +m[1]);
  if (x.getDate() !== +m[1] || x.getMonth() !== +m[2] - 1) return null;
  return x;
}

interface Activity {
  color: string;
  text: React.ReactNode;
  time: string;
}

export function ApplicationDetail() {
  const { ref } = useParams();
  const { role } = useSession();
  const toast = useToast();
  const d = useMemo(() => getApplicationDetail(ref ?? null), [ref]);
  usePageMeta('applications', 'Application detail', ['Home', 'Applications', d.ref]);

  const [currentStart, setCurrentStart] = useState<Date>(d.tenancyStartDate);
  const [deedVersion, setDeedVersion] = useState(1);
  const [amendedDates, setAmendedDates] = useState<{ issue: string; expiry: string } | null>(null);
  const [extraActivity, setExtraActivity] = useState<Activity[]>([]);
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendInput, setAmendInput] = useState('');

  const reached = d.status === 'sent' ? 1 : d.status === 'paid' ? 2 : 3;
  const steps = [
    { label: 'Sent', date: d.sentStr, note: `Referral sent to tenant by ${d.referrer}` },
    { label: 'Paid', date: d.paidStr || 'Awaiting payment', note: d.paidStr ? `Guarantor fee paid · ${d.rent}` : 'Guarantor fee not yet paid' },
    { label: 'Deed Issued', date: d.deedStr || 'Awaiting deed', note: d.deedStr ? 'Guarantee deed issued and stored' : 'Deed not yet issued' },
  ];

  const isDeed = d.status === 'deed';
  const deedName = `Guarantee_Deed_${d.ref}${deedVersion > 1 ? `_v${deedVersion}` : ''}.pdf`;
  const deedMeta = deedVersion > 1 ? `PDF · 248 KB · reissued ${fmtShort(NOW)}` : `PDF · 248 KB · issued ${d.issue}`;
  const gsumIssue = isDeed ? amendedDates?.issue ?? d.issue : 'Pending';
  const gsumExpiry = isDeed ? amendedDates?.expiry ?? d.expiry : 'Pending';
  const gsumNote = isDeed ? 'Auto-assigned by the system' : 'Reserved · confirmed once the deed is issued';

  const baseActivity: Activity[] = [];
  if (d.deedStr) baseActivity.push({ color: 'var(--deed)', text: 'Deed issued and stored against the record', time: `${d.deedStr} · System` });
  if (d.paidStr) baseActivity.push({ color: 'var(--paid)', text: 'Guarantor fee paid by tenant', time: `${d.paidStr} · System` });
  baseActivity.push({ color: 'var(--sent)', text: 'Application sent to tenant', time: `${d.sentStr} · ${d.referrer}` });
  const activity = [...extraActivity, ...baseActivity];

  // ---- amend validation ----
  const PAYMENT = d.paymentDate;
  const win = PAYMENT ? amendWindow(PAYMENT) : null;
  const parsed = parseInput(amendInput);
  let amendTone: 'ok' | 'err' | 'neutral' = 'err';
  let amendText = 'Enter a valid date as dd/mm/yyyy';
  let canSave = false;
  if (parsed && win) {
    if (parsed < win.start || parsed > win.end) {
      amendText = `Must be within ${AMEND_WINDOW_DAYS} days of payment (${fmtShort(win.start)} – ${fmtShort(win.end)})`;
    } else if (parsed.getTime() === currentStart.getTime()) {
      amendTone = 'neutral';
      amendText = 'This is the current start date';
    } else {
      amendTone = 'ok';
      amendText = 'Valid. A new deed will be issued with this date.';
      canSave = true;
    }
  }

  function openAmend() {
    if (!PAYMENT) return;
    setAmendInput(fmtInput(currentStart));
    setAmendOpen(true);
  }

  function saveAmend() {
    if (!parsed || !canSave) return;
    const nextVersion = deedVersion + 1;
    setCurrentStart(parsed);
    setDeedVersion(nextVersion);
    if (isDeed) setAmendedDates({ issue: fmtShort(NOW), expiry: fmtShort(addYear(parsed)) });
    const who = role === 'superadmin' ? 'opndoor admin' : 'Management';
    setExtraActivity((prev) => [
      { color: 'var(--heliotrope)', text: <>Tenancy start amended to <b>{fmtLong(parsed)}</b>; deed reissued</>, time: `${fmtShort(NOW)} · ${who}` },
      ...prev,
    ]);
    setAmendOpen(false);
    toast(`Tenancy start updated to ${fmtLong(parsed)}. New deed of guarantee issued.`);
  }

  return (
    <>
      <div className="backbar">
        <Link to="/applications"><Icon name="arrowLeft" /> All applications</Link>
      </div>

      <div className="rec-head">
        <div className="rec-head__id">
          <span className="rec-head__av">{d.initials}</span>
          <div>
            <div className="rec-head__name">{d.name}</div>
            <div className="rec-head__meta">
              <Pill variant={d.status}>{d.statusLabel}</Pill>
              <span>·</span><span>Reference {d.ref}</span>
              <span>·</span><span>{d.branch} · {d.agency}</span>
            </div>
          </div>
        </div>
        <div className="rec-head__actions">
          <Button variant="ghost" size="sm"><Icon name="share" /> Share</Button>
          {isDeed && <Button variant="dark" size="sm"><Icon name="download" /> Download deed</Button>}
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <CardHead title="Status timeline" sub="Sent to Paid to Deed Issued" />
        <CardBody>
          <StatusTimeline steps={steps} reached={reached} />
        </CardBody>
      </Card>

      <div className="detail-grid">
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <CardHead title="Tenant details" />
            <CardBody style={{ paddingTop: 6, paddingBottom: 6 }}>
              <div className="drow"><span className="drow__k">Full name</span><span className="drow__v"><b>{d.fullName}</b></span></div>
              <div className="drow"><span className="drow__k">Date of birth</span><span className="drow__v">{d.dob}</span></div>
              <div className="drow"><span className="drow__k">Email</span><span className="drow__v">{d.email}</span></div>
              <div className="drow"><span className="drow__k">Phone</span><span className="drow__v">{d.phone}</span></div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Property" />
            <CardBody style={{ paddingTop: 6, paddingBottom: 6 }}>
              <div className="drow"><span className="drow__k">Address line 1</span><span className="drow__v">{d.addr1}</span></div>
              <div className="drow"><span className="drow__k">Address line 2</span><span className="drow__v">—</span></div>
              <div className="drow"><span className="drow__k">City / town</span><span className="drow__v">{d.city}</span></div>
              <div className="drow"><span className="drow__k">County</span><span className="drow__v">{d.county}</span></div>
              <div className="drow"><span className="drow__k">Postcode</span><span className="drow__v"><b>{d.postcode}</b></span></div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Referring agent" sub="Claim contact. The deed is in favour of the property." />
            <CardBody style={{ paddingTop: 6, paddingBottom: 6 }}>
              <div className="drow"><span className="drow__k">Agency</span><span className="drow__v"><b>{d.agency}</b></span></div>
              <div className="drow"><span className="drow__k">Branch</span><span className="drow__v">{d.branch}</span></div>
              <div className="drow"><span className="drow__k">Address</span><span className="drow__v">{d.agentAddr}</span></div>
              <div className="drow"><span className="drow__k">Deed in favour of</span><span className="drow__v">{d.addr1}, {d.postcode}</span></div>
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title="Tenancy"
              actions={
                PAYMENT && (
                  <RoleOnly roles={['superadmin', 'management']}>
                    <Button variant="ghost" size="sm" onClick={openAmend}><Icon name="calendar" /> Amend start date</Button>
                  </RoleOnly>
                )
              }
            />
            <CardBody style={{ paddingTop: 6, paddingBottom: 6 }}>
              <div className="drow"><span className="drow__k">Monthly rent</span><span className="drow__v"><b style={{ fontFamily: 'var(--display)', fontSize: 16 }}>{d.rent}</b> per month</span></div>
              <div className="drow"><span className="drow__k">Tenancy start</span><span className="drow__v">{fmtLong(currentStart)}</span></div>
              <div className="drow"><span className="drow__k">Referrer</span><span className="drow__v">{d.referrer}</span></div>
            </CardBody>
          </Card>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card className="gsum">
            <CardBody>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Guarantee reference</div>
              <div className="gsum__ref">{d.ref}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 14 }}>{gsumNote}</div>
              <div className="gsum__row"><span className="k">Issue date</span><span className="v">{gsumIssue}</span></div>
              <div className="gsum__row"><span className="k">Expiry date</span><span className="v">{gsumExpiry}</span></div>
              <div className="gsum__row"><span className="k">Guarantee period</span><span className="v">12 months</span></div>
              <div className="gsum__row"><span className="k">Guaranteed annual rent</span><span className="v">{d.annual}</span></div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Guarantee deed" />
            <CardBody>
              {isDeed ? (
                <>
                  <div className="deed">
                    <span className="deed__ic"><Icon name="file" strokeWidth={1.8} /></span>
                    <div className="grow">
                      <div className="deed__t">{deedName}</div>
                      <div className="deed__s">{deedMeta}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <Button variant="primary" block><Icon name="download" /> Download deed</Button>
                  </div>
                </>
              ) : (
                <div className="deed" style={{ opacity: 0.85 }}>
                  <span className="deed__ic" style={{ color: 'var(--ink-mute)' }}><Icon name="clock" strokeWidth={1.8} /></span>
                  <div className="grow">
                    <div className="deed__t">Deed not yet issued</div>
                    <div className="deed__s">{d.status === 'paid' ? 'Issued shortly after payment' : 'Issued once the guarantor fee is paid'}</div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Activity" />
            <CardBody style={{ paddingTop: 8, paddingBottom: 8 }}>
              {activity.map((a, i) => (
                <div className="note-item" key={i}>
                  <span className="note-item__dot" style={{ background: a.color }} />
                  <div>
                    <div className="note-item__t">{a.text}</div>
                    <div className="note-item__time">{a.time}</div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* AMEND MODAL */}
      <Modal
        open={amendOpen}
        onClose={() => setAmendOpen(false)}
        width={460}
        title="Amend tenancy start date"
        sub="The start date can be amended while it stays within 7 days of the payment date. Saving reissues the Deed of Guarantee with the corrected date."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAmendOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveAmend} disabled={!canSave}>Save and reissue deed</Button>
          </>
        }
      >
        <div className="amend-facts">
          <div className="amend-fact"><div className="k">Payment date</div><div className="v">{PAYMENT ? fmtLong(PAYMENT) : '—'}</div></div>
          <div className="amend-fact"><div className="k">Current start</div><div className="v">{fmtLong(currentStart)}</div></div>
        </div>
        <div className="field">
          <label htmlFor="amend-input">New tenancy start date</label>
          <input id="amend-input" type="text" inputMode="numeric" placeholder="dd/mm/yyyy" autoComplete="off" value={amendInput} onChange={(e) => setAmendInput(e.target.value)} />
        </div>
        <div className={`amend-msg${amendTone === 'ok' ? ' amend-msg--ok' : amendTone === 'err' ? ' amend-msg--err' : ''}`} style={amendTone === 'neutral' ? { color: 'var(--ink-mute)' } : undefined}>
          <Icon name={amendTone === 'err' ? 'info' : 'check'} strokeWidth={2.4} style={amendTone === 'neutral' ? { color: 'var(--ink-mute)' } : amendTone === 'ok' ? { color: 'var(--deed)' } : undefined} />
          {amendText}
        </div>
      </Modal>
    </>
  );
}
