/* =====================================================================
   Login.

   Single-step email + password sign in. (2FA/TOTP flow removed.)
   ===================================================================== */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/data';
import { SUPABASE_ENABLED } from '@/lib/supabase';
import { useSession } from '@/session/SessionContext';
import { Button } from '@/components/ui/Button';
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

  // Already authenticated -> straight to the app.
  useEffect(() => {
    if (SUPABASE_ENABLED && status === 'ready') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  async function submitCreds(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!SUPABASE_ENABLED) {
      authService.login(email.trim(), password);
      navigate('/dashboard');
      return;
    }
    setBusy(true);
    const r = await authService.signIn(email, password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? 'Wrong email or password.');
      return;
    }
    navigate('/dashboard');
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
            <span className="auth__flow-ic">📨</span>
            <div><div className="auth__flow-t">Refer in seconds</div><div className="auth__flow-s">Add a tenant and send the application</div></div>
          </div>
          <div className="auth__flow-item">
            <span className="auth__flow-ic">📈</span>
            <div><div className="auth__flow-t">Track to deed issued</div><div className="auth__flow-s">Live funnel and commission earned</div></div>
          </div>
        </div>
      </aside>

      <section className="auth__form-wrap">
        <div className="auth__card">
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
              <PasswordInput id="pass" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="auth__row auth__row--end">
              <Link to={`/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`}>Forgot password?</Link>
            </div>
            <Button variant="primary" block type="submit" arrow disabled={busy}>{busy ? 'Signing in…' : 'Continue'}</Button>
          </form>
          <p className="auth__foot">Not set up yet? Ask your administrator for access, or use the contact details on this screen.</p>
        </div>
      </section>
    </div>
  );
}