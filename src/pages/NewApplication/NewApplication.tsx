/* =====================================================================
   New application — create a referral. Tenant, Property, Tenancy and the
   linked Agent & branch select-or-add (AgentBranchPicker). Submitting is
   mocked: it routes back to the applications list.

   INTEGRATION: createReferral posts the referral; the guarantee reference,
   issue date and expiry are assigned by the system on payment/issue.
   ===================================================================== */
import { useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createReferral } from '@/data';
import { usePageMeta } from '@/components/layout/pageMeta';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Field } from '@/components/ui/Field';
import { AgentBranchPicker, type AgentBranchValue } from '@/components/AgentBranchPicker';
import './NewApplication.css';

export function NewApplication() {
  usePageMeta('new', 'New application', ['Home', 'Applications', 'New']);
  const navigate = useNavigate();
  const agentBranch = useRef<AgentBranchValue>({ agency: '', branch: '' });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    // INTEGRATION: POST /referrals with the collected fields.
    createReferral({
      title: String(f.get('title') || ''),
      firstName: String(f.get('first') || ''),
      lastName: String(f.get('last') || ''),
      dob: String(f.get('dob') || ''),
      email: String(f.get('email') || ''),
      phone: String(f.get('phone') || ''),
      addr1: String(f.get('l1') || ''),
      addr2: String(f.get('l2') || ''),
      city: String(f.get('city') || ''),
      county: String(f.get('county') || ''),
      postcode: String(f.get('post') || ''),
      rent: Number(f.get('rent') || 0),
      tenancyStart: String(f.get('start') || ''),
      agency: agentBranch.current.agency,
      branch: agentBranch.current.branch,
    });
    navigate('/applications');
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>New referral</Eyebrow>
          <h1 className="page-head__title" style={{ marginTop: 10 }}>New application</h1>
          <p className="page-head__sub">Refer a failed-referencing tenant to opndoor's professional guarantor service, where opndoor provides a Deed of Guarantee in favour of the property. Complete each section, then send the application.</p>
        </div>
        <div className="page-head__actions">
          <Button variant="ghost" size="sm" to="/applications">Cancel</Button>
          <Button variant="primary" size="sm" type="submit" form="na-form" arrow>Send application</Button>
        </div>
      </div>

      <div className="na-grid">
        <form className="na-form" id="na-form" onSubmit={submit}>
          {/* 1. TENANT */}
          <section className="card sec" id="sec-tenant">
            <div className="sec__head"><span className="sec__num">1</span><div><div className="sec__title">Tenant</div><div className="sec__sub">The tenant being referred</div></div></div>
            <CardBody>
              <div className="form-grid">
                <Field label="Title" htmlFor="t-title" style={{ maxWidth: 120 }}>
                  <select id="t-title" name="title" defaultValue="Ms"><option>Mr</option><option>Mrs</option><option>Ms</option><option>Mx</option><option>Dr</option></select>
                </Field>
                <div className="field span-2" style={{ gridColumn: '2 / 3' }} />
                <Field label="First name" htmlFor="t-first"><input id="t-first" name="first" type="text" placeholder="Amelia" /></Field>
                <Field label="Last name" htmlFor="t-last"><input id="t-last" name="last" type="text" placeholder="Hartley" /></Field>
                <Field label="Date of birth" htmlFor="t-dob"><input id="t-dob" name="dob" type="text" inputMode="numeric" placeholder="dd/mm/yyyy" /></Field>
                <Field label="Email" htmlFor="t-email"><input id="t-email" name="email" type="email" placeholder="amelia@example.com" /></Field>
                <Field label="Phone" htmlFor="t-phone"><input id="t-phone" name="phone" type="tel" placeholder="+44 7700 900000" /></Field>
              </div>
            </CardBody>
          </section>

          {/* 2. PROPERTY */}
          <section className="card sec" id="sec-property">
            <div className="sec__head"><span className="sec__num">2</span><div><div className="sec__title">Property</div><div className="sec__sub">The address being let</div></div></div>
            <CardBody>
              <div className="form-grid">
                <Field label="Address line 1" htmlFor="p-l1" span2><input id="p-l1" name="l1" type="text" placeholder="Flat 4, 18 Onslow Gardens" /></Field>
                <Field label="Address line 2" htmlFor="p-l2" hint="Optional" span2><input id="p-l2" name="l2" type="text" /></Field>
                <Field label="City / town" htmlFor="p-city"><input id="p-city" name="city" type="text" placeholder="London" /></Field>
                <Field label="County" htmlFor="p-county"><input id="p-county" name="county" type="text" placeholder="Greater London" /></Field>
                <Field label="Postcode" htmlFor="p-post" style={{ maxWidth: 200 }}><input id="p-post" name="post" type="text" placeholder="SW7 3LA" /></Field>
              </div>
            </CardBody>
          </section>

          {/* 3. TENANCY */}
          <section className="card sec" id="sec-tenancy">
            <div className="sec__head"><span className="sec__num">3</span><div><div className="sec__title">Tenancy</div><div className="sec__sub">Rent and start date</div></div></div>
            <CardBody>
              <div className="form-grid">
                <Field label="Monthly rent (£)" htmlFor="ty-rent"><input id="ty-rent" name="rent" type="number" placeholder="2450" /></Field>
                <Field label="Tenancy start date" htmlFor="ty-start"><input id="ty-start" name="start" type="text" inputMode="numeric" placeholder="dd/mm/yyyy" /></Field>
              </div>
            </CardBody>
          </section>

          {/* 4. AGENT & BRANCH */}
          <section className="card sec" id="sec-branch">
            <div className="sec__head"><span className="sec__num">4</span><div><div className="sec__title">Agent &amp; branch</div><div className="sec__sub">Select the agent this referral belongs to, then the branch. You can add a new agent or branch on the fly.</div></div></div>
            <CardBody>
              <AgentBranchPicker onChange={(v) => { agentBranch.current = v; }} />
            </CardBody>
          </section>

          <div style={{ marginTop: 6 }}>
            <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', margin: '0 0 12px' }}>Guarantee reference, issue date and expiry are assigned automatically.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Button variant="ghost" to="/applications">Cancel</Button>
              <Button variant="primary" type="submit" arrow>Send application</Button>
            </div>
          </div>
        </form>

        {/* RAIL */}
        <aside className="na-rail">
          <Card>
            <CardBody style={{ padding: 16 }}>
              <div className="navrail">
                <a href="#sec-tenant" className="is-active"><span className="dot" />Tenant</a>
                <a href="#sec-property"><span className="dot" />Property</a>
                <a href="#sec-tenancy"><span className="dot" />Tenancy</a>
                <a href="#sec-branch"><span className="dot" />Agent &amp; branch</a>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
