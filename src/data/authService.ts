/* =====================================================================
   Auth service — currently a two-step form with NO real authentication.

   INTEGRATION (HANDOFF §8):
   - login: validate credentials, issue a time-limited 2FA code, and return
     enough to drive step 2. A real session carries the user's role + partner.
   - verify2fa: verify the code and establish the session; the front end then
     seeds SessionContext from that session instead of the demo role switcher.
   - requestPasswordReset: generate a time-limited reset token and email it;
     a separate set-new-password page consumes the token.
   ===================================================================== */

export interface LoginResult {
  ok: boolean;
  requires2fa: boolean;
  /** Masked email for the "we sent a code to…" line. */
  maskedEmail: string;
}

/** Mask an email for the 2FA step: "p••••@domain". */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (!parts[0]) return email;
  return `${parts[0].charAt(0)}••••@${parts[1] || ''}`;
}

/** INTEGRATION: validate credentials + issue a 2FA code. Mocked as always-ok. */
export function login(email: string, _password: string): LoginResult {
  return { ok: true, requires2fa: true, maskedEmail: maskEmail(email) };
}

/** INTEGRATION: verify the 6-digit code and establish the session. Mocked as always-ok. */
export function verify2fa(_code: string): { ok: boolean } {
  return { ok: true };
}

/** INTEGRATION: generate a reset token and send the email. Mocked as a no-op. */
export function requestPasswordReset(_email: string): { ok: boolean } {
  return { ok: true };
}
