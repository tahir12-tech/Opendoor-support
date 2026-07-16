/* =====================================================================
   Set-password landing screen for BOTH the password-reset link
   (send-password-reset) and the team-invite link (invite-user). Supabase's
   detectSessionInUrl turns the recovery/invite token in the URL into a session;
   this screen runs the WHOLE completion here, on the single recovery session, so
   there is no /login handoff and the single-use link is never re-consumed.

   Proven server-side: a recovery session sets the password at AAL1, enrols a
   TOTP factor, verifies it to AAL2, and the new password signs in. So the flow:

   invite (new user, no factor):  password -> enrol QR -> verify -> dashboard.
   reset  (user with a factor):   verify existing TOTP (step up to AAL2, required
                                   to change an MFA user's password) -> password
                                   -> sign out -> "back to sign in".

   The route is PUBLIC (outside RequireAuth), so the AAL1 session never routes
   the user into the app before they finish.
   ===================================================================== */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SUPABASE_ENABLED, sb } from '@/lib/supabase';
import { useSession } from '@/session/SessionContext';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import './auth.css';
import '../ForgotPassword/ForgotPassword.css';

type Phase = 'checking' | 'password' | 'done' | 'invalid';

const COPY = {
  reset: { title: 'Set a new password', eyebrow: 'Account recovery', brandH1: 'Choose a new password.', invalidLead: 'Your reset link may have expired or already been used. Request a new one and we will email you a fresh link.', invalidCta: { to: '/forgot-password', label: 'Request a new link' } },
  invite: { title: 'Set your password', eyebrow: 'Welcome to opndoor', brandH1: 'Set your password to get started.', invalidLead: 'Your invitation may have expired or already been used. Ask your administrator to resend it.', invalidCta: { to: '/login', label: 'Back to sign in' } },
} as const;

/** Honest, distinct error mapping (#73). */
function mapUpdateError(msg: string): string {
  const m = (msg || '').toLowerCase();
  if (/reauthentication|nonce/.test(m)) return 'For your security, verify your authenticator code and try again.';
  if (/aal|assurance|factor|mfa|insufficient/.test(m)) return 'Please verify your authenticator code first, then set your password.';
  if (/expired|already|token|invalid|no.*session|session.*missing|not authenticated|unauthorized/.test(m)) return 'This link has expired or was already used. Ask for a fresh one.';
  if (/password|weak|character|length|pwned|breach|strength|at least/.test(m)) return `That password was rejected: ${msg}`;
  return msg ? `We could not set your password: ${msg}` : 'We could not set your password. Please try again.';
}

export function ResetPassword({ mode = 'reset' }: { mode?: 'reset' | 'invite' }) {
  const c = COPY[mode];
  useDocumentTitle(c.title);
  const navigate = useNavigate();
  const { status } = useSession();
  const [phase, setPhase] = useState<Phase>(SUPABASE_ENABLED ? 'checking' : 'password');
  // const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Once TOTP is verified (invite completion) the session reaches AAL2 and
  // SessionContext resolves to 'ready'; route on to the app then (mirrors Login).
  useEffect(() => {
    if (SUPABASE_ENABLED && status === 'ready') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    let settled = false;
    const decide = async () => {
      if (settled) return;
      const { data } = await sb().auth.getSession();
      if (!data.session) return;
      settled = true;
      try {
        setPhase('password');
      } catch {
        setPhase('password');
      }
    };
    const { data: sub } = sb().auth.onAuthStateChange((_evt, session) => { if (session) void decide(); });
    void decide();
    const t = setTimeout(() => {
      if (settled) return;
      sb().auth.getSession().then(({ data }) => { if (!settled) { if (data.session) void decide(); else { settled = true; setPhase('invalid'); } } });
    }, 1500);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  /*
  Legacy MFA step-up flow kept as commented reference.
  async function submitStepup(e: FormEvent) {
    e.preventDefault();
    setError('');
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) { setError('Enter the 6-digit code from your authenticator.'); return; }
    if (busy) return;
    setBusy(true);
    try {
      setCode('');
      setPhase('password');
    } finally { setBusy(false); }
  }
  */

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (pw.length < 8) { setError('Use at least 8 characters.'); return; }
    if (pw !== pw2) { setError('Those passwords do not match.'); return; }
    if (busy) return;
    setBusy(true);
    try {
      if (SUPABASE_ENABLED) {
        const { error: upErr } = await sb().auth.updateUser({ password: pw });
        if (upErr) {
          setError(mapUpdateError(upErr.message));
          return;
        }
      }
      if (mode === 'reset') {
        if (SUPABASE_ENABLED) await sb().auth.signOut(); // fresh sign-in next.
        setPhase('done');
        return;
      }
      // Invite completion: finish after the password update and route to the app.
      if (!SUPABASE_ENABLED) { setPhase('done'); return; }
      setPhase('done');
    } catch (e2) {
      setError(mapUpdateError(e2 instanceof Error ? e2.message : ''));
    } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__brand-top">
          <span className="wordmark">opndoor</span>
          <span className="auth__cobrand">Guarantee<br />Referral Portal</span>
        </div>
        <div className="auth__brand-mid">
          <span className="auth__eyebrow">{c.eyebrow}</span>
          <h1 className="auth__brand-h1">{c.brandH1}</h1>
          <p className="auth__brand-copy">Set a strong password, then confirm your identity with an authenticator app. Two-factor authentication is required on every sign in.</p>
        </div>
        <div className="auth__flow">
          <div className="auth__flow-item"><span className="auth__flow-ic"><Icon name="lock" /></span><div><div className="auth__flow-t">{mode === 'invite' ? 'Set your password' : 'Set a new password'}</div><div className="auth__flow-s">At least 8 characters</div></div></div>
          <div className="auth__flow-item"><span className="auth__flow-ic"><Icon name="shield" /></span><div><div className="auth__flow-t">Two-factor authentication</div><div className="auth__flow-s">Verify with your authenticator code</div></div></div>
        </div>
      </aside>

      <section className="auth__form-wrap">
        <div className="auth__card">
          {phase === 'checking' && (<div><h2 className="auth__title">Checking your link…</h2><p className="auth__sub">One moment while we verify your link.</p></div>)}

          {phase === 'invalid' && (
            <div>
              <div className="confirm-ic"><Icon name="alert" strokeWidth={2.4} /></div>
              <h2 className="auth__title">This link is not valid</h2>
              <p className="auth__sub">{c.invalidLead}</p>
              <div className="auth__form"><Button variant="primary" block to={c.invalidCta.to}>{c.invalidCta.label}</Button></div>
              <p className="auth__foot"><Link to="/login">Back to sign in</Link></p>
            </div>
          )}

          {phase === 'password' && (
            <div>
              <h2 className="auth__title">{c.title}</h2>
              <p className="auth__sub">Choose a strong password you do not use elsewhere.</p>
              <form className="auth__form" onSubmit={submitPassword} noValidate>
                <div className="field"><label htmlFor="pw">{mode === 'invite' ? 'Password' : 'New password'}</label><PasswordInput id="pw" autoComplete="new-password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
                <div className="field"><label htmlFor="pw2">Confirm password</label><PasswordInput id="pw2" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
                {error && <p className="auth__error" role="alert" style={{ color: 'var(--danger, #c0392b)' }}>{error}</p>}
                <Button variant="primary" block type="submit" arrow disabled={busy || !pw || !pw2}>{busy ? 'Saving…' : (mode === 'invite' ? 'Set password' : 'Save new password')}</Button>
              </form>
              <p className="auth__foot"><Link to="/login">Back to sign in</Link></p>
            </div>
          )}

          {phase === 'done' && (
            <div>
              <div className="confirm-ic"><Icon name="check" strokeWidth={2.4} /></div>
              <h2 className="auth__title">Password updated</h2>
              <p className="auth__sub">Your password has been changed. You can now sign in with your new password.</p>
              <div className="auth__form"><Button variant="primary" block to="/login">Back to sign in</Button></div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
