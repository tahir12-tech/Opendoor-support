/* =====================================================================
   Dashboard — the analytics home. Funnel, hero KPIs, commission (role-gated,
   per-partner rates), the three volume charts with measure dropdowns, the
   12-month trend (Management + opndoor admin), the support metrics, the
   period + partner filters, and the three CSV exports incl. the bordereau.

   Every figure comes from analyticsService/exportsService (the parametric
   model). INTEGRATION points live in those services, not here.
   ===================================================================== */
import { useMemo, useState } from 'react';
import {
  ALL_PARTNERS, buildApplicationCsv, buildBordereauCsv, buildPerformanceCsv, downloadCsv,
  fmtBig, getDashboardData, getMonthlyTrend, getPartners, getPeriods, partnerName,
  trendPartnerRate, type Period,
} from '@/data';
import type { ShapeRow } from '@/data/mock/analyticsModel';
import { DEFAULT_INSURANCE_RATE } from '@/data/mock/analyticsModel';
import { useSession } from '@/session/SessionContext';
import { usePageMeta } from '@/components/layout/pageMeta';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card, CardBody, CardFoot, CardHead } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import { Tag } from '@/components/ui/Tag';
import { RoleOnly } from '@/components/ui/RoleOnly';
import { RoleNote } from '@/components/ui/RoleNote';
import { BarChart, type BarRow } from '@/components/ui/BarChart';
import { MeasureSelect, PeriodSelect, TrendSelect } from '@/components/ui/Select';
import './Dashboard.css';

type Measure = 'value' | 'count';
type TrendMeasure = 'commission' | 'value' | 'count';
type TrendView = 'month' | 'branch' | 'agency' | 'referrer';

function measureLabel(m: string): string {
  return m === 'commission' ? 'Commission earned' : m === 'value' ? 'Fees collected' : 'Referrals sent';
}

/** Sort + format shape rows for a volume chart under the chosen measure. */
function volumeRows(rows: ShapeRow[], m: Measure): BarRow[] {
  return rows
    .slice()
    .sort((a, b) => (m === 'value' ? b[2] - a[2] : b[1] - a[1]))
    .map((r) => ({
      label: r[0],
      sub: r[3],
      value: m === 'value' ? r[2] : r[1],
      display: m === 'value' ? fmtBig(r[2]) : String(r[1]),
    }));
}

export function Dashboard() {
  usePageMeta('dashboard', 'Dashboard', ['Home', 'Dashboard']);
  const { role, partnerScope, selectedPartner, setSelectedPartner, period, setPeriod } = useSession();

  const d = useMemo(() => getDashboardData(role, period, partnerScope), [role, period, partnerScope]);

  const [measure, setMeasure] = useState<Record<'branch' | 'agency' | 'referrer', Measure>>({ branch: 'value', agency: 'value', referrer: 'value' });
  const [trendView, setTrendView] = useState<TrendView>('month');
  const [trendMeasure, setTrendMeasure] = useState<TrendMeasure>('commission');

  const partners = getPartners();
  const periods = getPeriods();

  const scopeName = partnerScope === ALL_PARTNERS ? 'All partners' : partnerName(partnerScope);

  // ---- volume charts ----
  const chartMeta: { key: 'branch' | 'agency' | 'referrer'; rows: ShapeRow[]; scope: string }[] = [
    { key: 'branch', rows: d.branches, scope: d.branchScope },
    { key: 'agency', rows: d.agencies, scope: d.agencyScope },
    { key: 'referrer', rows: d.referrers, scope: d.referrerScope },
  ];

  // ---- monthly trend ----
  const partnerRate = trendPartnerRate(role, partnerScope);
  const trendVal = (r: ShapeRow): number => (trendMeasure === 'count' ? r[1] : trendMeasure === 'commission' ? r[2] * partnerRate : r[2]);
  const rawTrend = getMonthlyTrend(trendView);
  const trendRows: BarRow[] = useMemo(() => {
    const rows = rawTrend.slice();
    // "By month" keeps chronological order (latest highlighted); breakdowns sort by value.
    if (trendView !== 'month') rows.sort((a, b) => trendVal(b) - trendVal(a));
    return rows.map((r) => ({ label: r[0], sub: r[3], value: trendVal(r), display: trendMeasure === 'count' ? String(r[1]) : fmtBig(trendVal(r)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTrend, trendView, trendMeasure, partnerRate]);
  const trendTopIndex = trendView === 'month' ? trendRows.length - 1 : 0;
  const trendSub = `${measureLabel(trendMeasure)} · ${trendView === 'month' ? 'last 12 months' : `by ${trendView} · last 12 months`}`;

  // ---- exports ----
  const [bdxOpen, setBdxOpen] = useState(false);
  const [bdxMonth, setBdxMonth] = useState('2026-06');
  const [bdxRate, setBdxRate] = useState(String(DEFAULT_INSURANCE_RATE));

  function exportSummary() {
    const { csv, filename } = buildPerformanceCsv(role, period as Period);
    downloadCsv(csv, filename);
  }
  function exportApplications() {
    const out = buildApplicationCsv(role, period as Period);
    if (out) downloadCsv(out.csv, out.filename);
  }
  function exportBordereau() {
    const mv = (bdxMonth || '2026-06').split('-');
    const rate = parseFloat(bdxRate);
    const out = buildBordereauCsv(role, +mv[0], +mv[1] - 1, isNaN(rate) ? DEFAULT_INSURANCE_RATE : rate);
    if (out) downloadCsv(out.csv, out.filename);
    setBdxOpen(false);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>{`${scopeName} · Performance · ${period.label}`}</Eyebrow>
          <h1 className="page-head__title" style={{ marginTop: 10 }}>Dashboard</h1>
          <p className="page-head__sub">{d.sub}</p>
        </div>
        <div className="page-head__actions">
          <RoleOnly roles={['superadmin']}>
            <PeriodSelect
              ariaLabel="Partner"
              title="View all partners combined, or drill into one partner"
              value={selectedPartner}
              onChange={setSelectedPartner}
              options={[{ value: ALL_PARTNERS, label: 'All partners' }, ...partners.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </RoleOnly>
          <PeriodSelect ariaLabel="Dashboard time period" value={period.id} onChange={setPeriod} options={periods.map((p) => ({ value: p.id, label: p.label }))} />
          <Button variant="dark" size="sm" onClick={exportSummary} title="Downloads a structured CSV of the dashboard analytics for the selected time period">
            <Icon name="download" /> Export summary
          </Button>
          <RoleOnly roles={['superadmin', 'management']}>
            <Button variant="ghost" size="sm" onClick={exportApplications} title="Downloads one row per application, pseudonymised by guarantee reference">
              <Icon name="apps" /> Application export
            </Button>
          </RoleOnly>
          <RoleOnly roles={['superadmin']}>
            <Button variant="primary" size="sm" onClick={() => setBdxOpen(true)} title="Monthly underwriter bordereau (C&C format) with full tenant details. opndoor admin only.">
              <Icon name="shield" /> Bordereau
            </Button>
          </RoleOnly>
        </div>
      </div>

      <RoleOnly roles={['referrer']}>
        <RoleNote style={{ marginBottom: 18 }}>
          You are viewing your <b>own referrals only</b>. Management and super-admin users see the full portfolio across every agency and branch.
        </RoleNote>
      </RoleOnly>

      <div className="dash-grid">
        {/* FUNNEL */}
        <Card>
          <CardHead
            title="Live referral funnel"
            sub={d.funnelScope}
            actions={<Pill variant="paid" style={{ fontSize: 12 }}>Sent to Paid is the headline metric</Pill>}
          />
          <CardBody>
            <div className="funnel">
              <div className="fstage fstage--sent">
                <div className="fstage__top"><Pill variant="sent">Sent</Pill></div>
                <div className="fstage__count">{d.sent}</div>
                <div className="fstage__label">Referrals sent to tenants</div>
                <div className="fstage__bar"><i /></div>
              </div>
              <div className="fconnect fconnect--head">
                <div className="fconnect__cap">Sent → Paid</div>
                <div className="fconnect__rate">{d.sp}</div>
                <div className="fconnect__arrow"><Icon name="arrowRight" /></div>
              </div>
              <div className="fstage fstage--paid">
                <div className="fstage__top"><Pill variant="paid">Paid</Pill></div>
                <div className="fstage__count">{d.paid}</div>
                <div className="fstage__label">Guarantor fee paid</div>
                <div className="fstage__bar"><i /></div>
              </div>
              <div className="fconnect">
                <div className="fconnect__cap">Paid → Deed</div>
                <div className="fconnect__rate">{d.pd}</div>
                <div className="fconnect__arrow"><Icon name="arrowRight" /></div>
              </div>
              <div className="fstage fstage--deed">
                <div className="fstage__top"><Pill variant="deed">Deed Issued</Pill></div>
                <div className="fstage__count">{d.deed}</div>
                <div className="fstage__label">Guarantee deeds issued</div>
                <div className="fstage__bar"><i /></div>
              </div>
            </div>
          </CardBody>
          <CardFoot>
            <span className="muted" style={{ fontSize: 12.5 }}>Overall sent to deed conversion <b style={{ color: 'var(--ink)' }}>{d.overall}</b></span>
            <Button variant="quiet" size="sm" to="/applications" arrow>View all applications</Button>
          </CardFoot>
        </Card>

        {/* HERO KPIs */}
        <section className="herorow">
          <RoleOnly roles={['superadmin', 'management']}>
            <div className="card hero-kpi hero-kpi--dark">
              <div className="kpi__label">Total guaranteed rent value</div>
              <div className="hero-kpi__row" style={{ marginTop: 10 }}>
                <span className="hero-kpi__big">{d.guaranteed}</span>
              </div>
              <p style={{ position: 'relative', fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 8, maxWidth: '42ch' }}>
                Annual rent under guarantee across {d.deedcount} issued deeds, at an initial 12-month guarantee period each.
              </p>
              <div className="hero-kpi__sub">
                <span className="lbl">Guarantor fees collected (one month's rent each)</span>
                <span className="val">{d.fees}</span>
              </div>
            </div>
          </RoleOnly>

          <RoleOnly roles={['referrer']}>
            <div className="card hero-kpi hero-kpi--dark">
              <div className="kpi__label">Your fees collected</div>
              <div className="hero-kpi__row" style={{ marginTop: 10 }}>
                <span className="hero-kpi__big">{d.fees}</span>
              </div>
              <p style={{ position: 'relative', fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 8, maxWidth: '42ch' }}>
                Guarantor fees from the referrals you sent that reached Paid, at one month's rent each.
              </p>
              <div className="hero-kpi__sub">
                <span className="lbl">Your referrals paid</span>
                <span className="val">{d.paid}</span>
              </div>
            </div>
          </RoleOnly>

          <RoleOnly roles={['superadmin', 'management']}>
            <div className="card hero-kpi">
              <div className="spread">
                <div className="kpi__label">Commission earned to date</div>
                <Tag>{d.commTag}</Tag>
              </div>
              <div className="hero-kpi__row" style={{ marginTop: 14 }}>
                <span className="comm-headline">{d.commHeadline}</span>
                <span className="kpi__delta kpi__delta--up"><Icon name="caretUp" strokeWidth={2.4} />12.4% vs prior period</span>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span className="muted" style={{ fontSize: 13 }}>{d.commSecondLbl}</span>
                <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{d.commSecondVal}</span>
              </div>
            </div>
          </RoleOnly>

          <RoleOnly roles={['referrer']}>
            <div className="card hero-kpi">
              <div className="spread">
                <div className="kpi__label">Your referral performance</div>
                <Tag>Your own slice</Tag>
              </div>
              <div className="hero-kpi__row" style={{ marginTop: 14 }}>
                <span className="comm-headline" style={{ color: 'var(--ink)' }}>{d.sent}</span>
                <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>referrals sent</span>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid var(--line)', display: 'flex', gap: 30 }}>
                <div><div className="muted" style={{ fontSize: 12 }}>Sent → Paid</div><div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--heliotrope-deep)', marginTop: 2 }}>{d.sp}</div></div>
                <div><div className="muted" style={{ fontSize: 12 }}>Paid → Deed</div><div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 2 }}>{d.pd}</div></div>
                <div><div className="muted" style={{ fontSize: 12 }}>Deeds issued</div><div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 2 }}>{d.deedcount}</div></div>
              </div>
            </div>
          </RoleOnly>
        </section>

        {/* CHARTS */}
        <section className="chartrow">
          {chartMeta.map(({ key, rows, scope }) => {
            const chart = (
              <Card key={key}>
                <CardHead
                  title={key === 'referrer' ? d.referrerTitle : key === 'branch' ? 'Volume by branch' : 'Volume by agency'}
                  sub={`${measureLabel(measure[key])} · ${scope}`}
                  actions={
                    <MeasureSelect
                      ariaLabel={`Measure for volume by ${key}`}
                      value={measure[key]}
                      onChange={(v) => setMeasure((m) => ({ ...m, [key]: v as Measure }))}
                      options={[{ value: 'value', label: 'Fees collected' }, { value: 'count', label: 'Referral count' }]}
                    />
                  }
                />
                <CardBody>
                  <BarChart rows={volumeRows(rows, measure[key])} topIndex={0} />
                </CardBody>
              </Card>
            );
            if (key === 'referrer') return chart;
            return (
              <RoleOnly key={key} roles={['superadmin', 'management']}>
                {chart}
              </RoleOnly>
            );
          })}
        </section>

        {/* MONTHLY TREND */}
        <RoleOnly roles={['superadmin', 'management']}>
          <Card style={{ marginBottom: 18 }}>
            <CardHead
              title="Monthly volume trend"
              sub={trendSub}
              actions={
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <TrendSelect
                    ariaLabel="Break the trend down by"
                    value={trendView}
                    onChange={(v) => setTrendView(v as TrendView)}
                    options={[{ value: 'month', label: 'By month' }, { value: 'branch', label: 'By branch' }, { value: 'agency', label: 'By agency' }, { value: 'referrer', label: 'By referrer' }]}
                  />
                  <TrendSelect
                    ariaLabel="Measure for the trend"
                    value={trendMeasure}
                    onChange={(v) => setTrendMeasure(v as TrendMeasure)}
                    options={[{ value: 'commission', label: 'Commission earned' }, { value: 'value', label: 'Fees collected' }, { value: 'count', label: 'Referral count' }]}
                  />
                </div>
              }
            />
            <CardBody>
              <BarChart rows={trendRows} topIndex={trendTopIndex} />
            </CardBody>
          </Card>
        </RoleOnly>

        {/* SUPPORT METRICS */}
        <div className="section-label"><Eyebrow>Operational health</Eyebrow></div>
        <section className="supportrow">
          <div className="card smetric">
            <div className="kpi__label">Average monthly rent</div>
            <div className="kpi__value" style={{ marginTop: 10 }}>{d.rent}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>Across all referred tenancies</div>
          </div>
          <div className="card smetric">
            <div className="kpi__label">Avg. time Sent → Payment</div>
            <div className="kpi__value" style={{ marginTop: 10 }}>4.2 <span className="unit">days</span></div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>From referral sent to fee paid</div>
          </div>
          <div className="card smetric">
            <div className="kpi__label">Avg. time Payment → Deed</div>
            <div className="kpi__value" style={{ marginTop: 10 }}>1.8 <span className="unit">days</span></div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>From fee paid to deed issued</div>
          </div>
          <div className="card smetric">
            <div className="kpi__label">Applications stuck at stage</div>
            <div className="stuck">
              <div className="stuck__col"><span className="stuck__n" style={{ color: 'var(--sent)' }}>{d.stuckSent}</span><span className="stuck__l">Sent · awaiting payment</span></div>
              <div className="stuck__col"><span className="stuck__n" style={{ color: 'var(--paid)' }}>{d.stuckPaid}</span><span className="stuck__l">Paid · awaiting deed</span></div>
            </div>
          </div>
        </section>
      </div>

      {/* BORDEREAU MODAL (opndoor admin only) */}
      {bdxOpen && role === 'superadmin' && (
        <div className="bdx-scrim is-open" onMouseDown={(e) => e.target === e.currentTarget && setBdxOpen(false)}>
          <div className="bdx" role="dialog" aria-modal="true">
            <div className="bdx__head">
              <div>
                <div className="bdx__title">Monthly bordereau</div>
                <div className="bdx__sub">Underwriter export (C&amp;C format) with full tenant details, for one calendar month by issue date. opndoor admin only.</div>
              </div>
              <button className="bdx__close" aria-label="Close" onClick={() => setBdxOpen(false)}><Icon name="x" /></button>
            </div>
            <div className="bdx__body">
              <div className="field">
                <label htmlFor="bdx-month">Month (by guarantee issue date)</label>
                <input type="month" id="bdx-month" min="2024-09" max="2026-12" value={bdxMonth} onChange={(e) => setBdxMonth(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="bdx-rate">Insurance rate applied to every row</label>
                <div className="bdx__rate">
                  <input type="number" id="bdx-rate" step="0.1" min="0" max="100" value={bdxRate} onChange={(e) => setBdxRate(e.target.value)} />
                  <span>%</span>
                </div>
                <span className="hint">A single configurable rate applied to all rows. Change here when the underwriter rate changes.</span>
              </div>
              <div className="bdx__warn">
                <Icon name="alert" />
                <span>Contains full tenant personal data. For the underwriter only. Never share with partner users.</span>
              </div>
            </div>
            <div className="bdx__foot">
              <Button variant="ghost" onClick={() => setBdxOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={exportBordereau}>Export bordereau</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
