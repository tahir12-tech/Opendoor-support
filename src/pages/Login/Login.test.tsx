import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

const navigateMock = vi.fn();
const signInMock = vi.fn();
const markMfaVerifiedMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/data', () => ({
  authService: {
    login: vi.fn(),
    signIn: signInMock,
    maskEmail: (email: string) => email,
    factorState: vi.fn().mockResolvedValue({ ok: true, hasVerifiedFactor: false, factorId: null, aal: 'aal1' }),
    enrolTotp: vi.fn().mockResolvedValue({ ok: true, factorId: 'factor-1', qr: '', secret: '' }),
    verify2fa: vi.fn(),
    verifyCode: vi.fn(),
  },
}));

vi.mock('@/session/SessionContext', () => ({
  useSession: () => ({ status: 'signedOut', markMfaVerified: markMfaVerifiedMock }),
}));

vi.mock('@/lib/supabase', () => ({ SUPABASE_ENABLED: true }));
vi.mock('@/hooks/useDocumentTitle', () => ({ useDocumentTitle: () => undefined }));

describe('Login', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInMock.mockReset();
    markMfaVerifiedMock.mockReset();
    signInMock.mockResolvedValue({ ok: true });
  });

  it('signs in directly with email and password without requiring an authenticator step', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('user@example.com', 'secret123');
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    expect(screen.queryByText(/verification code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/authenticator/i)).not.toBeInTheDocument();
  });
});
