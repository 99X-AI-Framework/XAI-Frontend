import { render, screen } from '@testing-library/react'
import { App } from './App'

const AUTH_STORAGE_KEY = 'xai.auth.isAuthenticated'

beforeEach(() => {
  window.localStorage.clear()
})

test('shows sign in and create account for guests', async () => {
  render(<App />)

  expect(await screen.findByText('AI Governance Middleware')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/create-account')
  expect(screen.getByRole('link', { name: /launch dashboard/i })).toHaveAttribute('href', '/sign-in')
})

test('hides auth links for signed-in visitors', async () => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, 'true')
  render(<App />)

  expect(await screen.findByRole('link', { name: /launch dashboard/i })).toHaveAttribute('href', '/dashboard')
  expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Create account' })).not.toBeInTheDocument()
})
