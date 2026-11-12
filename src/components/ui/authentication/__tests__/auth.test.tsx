import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { authRoutes } from '../routes'
import { RequireAuth } from '../components/RequireAuth'
import { authApi } from '../api/authApi'
import type { AuthenticatedResponse, OtpChallenge } from '../types'

vi.mock('../api/authApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/authApi')>()
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      refresh: vi.fn(),
      oauthProviders: vi.fn(),
      login: vi.fn(),
      signup: vi.fn(),
      verifyOtp: vi.fn(),
      resendOtp: vi.fn(),
      getChallenge: vi.fn(),
    },
  }
})

const mockUser = {
  id: 'u-1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  is_email_verified: true,
  has_password: true,
  created_at: '2026-11-13T00:00:00Z',
}

const mockChallenge: OtpChallenge = {
  status: 'otp_required',
  challenge_id: 'chal_1234567890abcdef',
  purpose: 'login',
  masked_email: 'a***a@example.com',
  code_length: 6,
  expires_in: 600,
  resend_available_in: 30,
  attempts_remaining: 5,
  resends_remaining: 5,
}

const mockAuth: AuthenticatedResponse = {
  status: 'authenticated',
  access_token: 'jwt.access.token',
  token_type: 'bearer',
  expires_in: 900,
  user: mockUser,
}

function renderApp(initialEntries: string[] = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<div>Dashboard Home</div>} />
          </Route>
          {authRoutes.map((r, i) =>
            r.children ? (
              <Route key={i} element={r.element}>
                {r.children.map((c) => (
                  <Route key={c.path} path={c.path} element={c.element} />
                ))}
              </Route>
            ) : (
              <Route key={r.path} path={r.path} element={r.element} />
            ),
          )}
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Authentication workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no session'))
    vi.mocked(authApi.oauthProviders).mockResolvedValue(['google', 'github'])
  })

  it('redirects unauthenticated users from protected routes to /login', async () => {
    renderApp(['/'])
    expect(await screen.findByText('Welcome back')).toBeInTheDocument()
  })

  it('completes login -> OTP verification -> authenticated dashboard', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.login).mockResolvedValueOnce(mockChallenge)
    vi.mocked(authApi.verifyOtp).mockResolvedValueOnce(mockAuth)

    renderApp(['/login'])
    await screen.findByText('Welcome back')

    await user.type(screen.getByLabelText(/email address/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'Sup3rSecret!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Verification code')).toBeInTheDocument()
    expect(screen.getByText('a***a@example.com')).toBeInTheDocument()

    const digitInputs = screen.getAllByRole('textbox', { name: /digit/i })
    expect(digitInputs).toHaveLength(6)
    await user.type(digitInputs[0], '123456')
    await user.click(screen.getByRole('button', { name: /verify & continue/i }))

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith('chal_1234567890abcdef', '123456')
    })
    expect(await screen.findByText('Dashboard Home')).toBeInTheDocument()
  })
})

