/* =====================================================================
   Login — two steps: credentials, then a 6-digit 2FA code with paste
   support. On success it routes to the dashboard.

   INTEGRATION: authService.login / verify2fa are mocked (always ok). A real
   auth service validates credentials, issues/verifies a time-limited code,
   and returns a session carrying the user's role and partner.
   ===================================================================== */
import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/data';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import '../auth/auth.css';
import './Login.css';

export function Login() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const [step, setStep] = useState<'creds' | '2fa'>('creds');
  const [email, setEmail] = useState('priya.nair@foxglove-residential.co.uk');
  const [masked, setMasked] = useState('p••••@foxglove-residential.co.uk');
  const [codes, setCodes] = useState<string[]>(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function submitCreds(e: FormEvent) {
    e.preventDefault();
    const res = authService.login(email.trim(), '');
    if (res.ok) {
      setMasked(res.maskedEmail);
      setStep('2fa');
      setTimeout(() => inputs.current[0]?.focus(), 0);
    }
  }

  function submit2fa(e: FormEvent) {
    e.preventDefault();
    authService.verify2fa(codes.join(''));
    navigate('/dashboard');
  }

  function setDigit(i: number, value: string) {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    setCodes((prev) => prev.map((c, j) => (j === i ? digit : c)));
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !codes[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    setCodes((prev) => prev.map((c, j) => digits[j] ?? c));
    inputs.current[Math.min(digits.length, 5)]?.focus();
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
            <div className={`auth__step-dot${step === 'creds' ? ' is-active' : ' is-done'}`}>
              <span className="n">1</span><span>Credentials</span>
            </div>
            <span className="auth__step-line" />
            <div className={`auth__step-dot${step === '2fa' ? ' is-active' : ''}`}>
              <span className="n">2</span><span>Verify</span>
            </div>
          </div>

          {step === 'creds' ? (
            <div>
              <h2 className="auth__title">Sign in to the portal</h2>
              <p className="auth__sub">Use the work email your administrator registered for you.</p>
              <form className="auth__form" onSubmit={submitCreds} noValidate>
                <div className="field">
                  <label htmlFor="email">Work email</label>
                  <input id="email" type="email" placeholder="you@foxglove-residential.co.uk" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="pass">Password</label>
                  <input id="pass" type="password" autoComplete="current-password" defaultValue="demo-password" required />
                </div>
                <div className="auth__row">
                  <label><input type="checkbox" /> Keep me signed in for 30 days</label>
                  <a href="/forgot-password">Forgot password?</a>
                </div>
                <Button variant="primary" block type="submit" arrow className="" >Continue</Button>
              </form>
              <p className="auth__foot">Not set up yet? Ask your administrator for access, or use the contact details on this screen.</p>
            </div>
          ) : (
            <div>
              <button className="back-link" type="button" onClick={() => setStep('creds')}>
                <Icon name="arrowLeft" /> Back
              </button>
              <h2 className="auth__title" style={{ marginTop: 16 }}>Enter your verification code</h2>
              <p className="auth__sub">We have sent a 6-digit code to <b style={{ color: 'var(--ink)' }}>{masked}</b>. The code expires in 10 minutes.</p>
              <div style={{ marginTop: 18 }}>
                <span className="twofa-chip"><Icon name="phone" /> Sent to your authenticator app</span>
              </div>
              <form className="auth__form" onSubmit={submit2fa} noValidate>
                <div className="field">
                  <label>6-digit code</label>
                  <div className="codes">
                    {codes.map((c, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        aria-label={`Digit ${i + 1}`}
                        className={c ? 'filled' : ''}
                        value={c}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => onKeyDown(i, e)}
                        onPaste={onPaste}
                      />
                    ))}
                  </div>
                </div>
                <Button variant="primary" block type="submit" arrow>Verify and sign in</Button>
              </form>
              <p className="resend" style={{ marginTop: 20 }}>
                Didn't get a code? <a href="#" onClick={(e) => e.preventDefault()}>Resend code</a> · <a href="#" onClick={(e) => e.preventDefault()}>Use SMS instead</a>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
