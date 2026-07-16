/* =====================================================================
   Login.

   Mock mode (tests / no env): the original always-ok two-step form.

   Supabase mode: step 1 is email + password (AAL1); step 2 is TOTP. First-time
   users enrol (QR + code); returning users are challenged for their code. A
   verified code steps the session up to AAL2, which the database requires
   before returning any data. SessionContext then loads the profile + data and
   this page routes on to the dashboard.
   ===================================================================== */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/data';
import { SUPABASE_ENABLED } from '@/lib/supabase';
import { useSession } from '@/session/SessionContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import '../auth/auth.css';
import './Login.css';




export function Login() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already authenticated (AAL2) -> straight to the app.
  useEffect(() => {
    if (SUPABASE_ENABLED && status === 'ready') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  /*
  Legacy MFA-based flow kept as commented reference.
  const [step, setStep] = useState<Step>('creds');
  const [masked, setMasked] = useState('');
  const [codes, setCodes] = useState<string[]>(['', '', '', '', '', '']);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    const code = codes.join('');
    if (!SUPABASE_ENABLED) {
      authService.verify2fa(code);
      navigate('/dashboard');
      return;
    }
    if (!factorId) return;
    setBusy(true);
    const r = await authService.verifyCode(factorId, code);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? 'That code was not right. Try again.');
      setCodes(['', '', '', '', '', '']);
      focusFirst();
      return;
    }
    markMfaVerified();
  }
  */

  async function submitCreds(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!SUPABASE_ENABLED) {
      authService.login(email.trim(), password);
      navigate('/dashboard', { replace: true });
      return;
    }
    setBusy(true);
    const r = await authService.signIn(email, password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? 'Wrong email or password.');
      return;
    }
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__brand-top">
          <span className="wordmark">opndoor</span>
          <span className="auth__cobrand">Guarantee<br />Referral Portal</span>
        </div>
        <div className="auth__brand-mid">
          <span className="auth__eyebrow">Partner sign in</span>
          <h1 className="auth__brand-h1">Refer with confidence. Track every step.</h1>
          <p className="auth__brand-copy">
            The white-labelled referral and tracking tool for partner teams. Refer failed-referencing tenants to opndoor's professional guarantor service, where opndoor provides a Deed of Guarantee in favour of the property, then follow them from sent through to deed issued.
          </p>
        </div>
        <div className="auth__flow">
          <div className="auth__flow-item">
            <span className="auth__flow-ic"><Icon name="send" /></span>
            <div><div className="auth__flow-t">Refer in seconds</div><div className="auth__flow-s">Add a tenant and send the application</div></div>
          </div>
          <div className="auth__flow-item">
            <span className="auth__flow-ic"><Icon name="trend" /></span>
            <div><div className="auth__flow-t">Track to deed issued</div><div className="auth__flow-s">Live funnel and commission earned</div></div>
          </div>
          <div className="auth__flow-item">
            <span className="auth__flow-ic"><Icon name="shield" /></span>
            <div><div className="auth__flow-t">Secure by design</div><div className="auth__flow-s">Two-factor authentication on every sign in</div></div>
          </div>
        </div>
      </aside>

      <section className="auth__form-wrap">
        <div className="auth__card">
          <div className="auth__steps">
            <div className="auth__step-dot is-active">
              <span className="n">1</span><span>Credentials</span>
            </div>
          </div>

          <div>
            <h2 className="auth__title">Sign in to the portal</h2>
            <p className="auth__sub">Use the work email your administrator registered for you.</p>
            {error && <p className="auth__error" style={{ color: 'var(--danger, #c0392b)' }}>{error}</p>}
            <form className="auth__form" onSubmit={submitCreds} noValidate>
              <div className="field">
                <label htmlFor="email">Work email</label>
                <input id="email" type="email" placeholder="you@company.com" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="pass">Password</label>
                <PasswordInput id="pass" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="auth__row auth__row--end">
                {/* Carry the typed email over so the reset form is prefilled (#60). */}
                <Link to={`/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`}>Forgot password?</Link>
              </div>
              <Button variant="primary" block type="submit" arrow disabled={busy}>{busy ? 'Signing in…' : 'Continue'}</Button>
            </form>
            <p className="auth__foot">Not set up yet? Ask your administrator for access, or use the contact details on this screen.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
