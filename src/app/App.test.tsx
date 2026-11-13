import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { authApi } from '@/components/ui/authentication'
import { App } from './App'

vi.mock('@/components/ui/authentication', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/authentication')>()
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      refresh: vi.fn(),
    },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

test('shows sign in and create account for guests', async () => {
  vi.mocked(authApi.refresh).mockRejectedValueOnce(new Error('no session'))
  render(<App />)

  expect(await screen.findByText('AI Governance Middleware')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signup')
  expect(screen.getByRole('link', { name: /launch dashboard/i })).toHaveAttribute('href', '/login')
})

test('hides auth links for signed-in visitors', async () => {
  vi.mocked(authApi.refresh).mockResolvedValueOnce({
    status: 'authenticated',
    access_token: 'test-token',
    token_type: 'bearer',
    expires_in: 900,
    user: {
      id: 'u-1',
      email: 'ada@example.com',
      name: 'Ada',
      is_email_verified: true,
      has_password: true,
      created_at: '2026-11-13T00:00:00Z',
    },
  })
  render(<App />)

  await waitFor(() => {
    expect(screen.getByRole('link', { name: /launch dashboard/i })).toHaveAttribute('href', '/dashboard')
  })
  expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Create account' })).not.toBeInTheDocument()
})