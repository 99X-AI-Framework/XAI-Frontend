import { render, screen } from '@testing-library/react'
import { App } from './App'
test('renders the frontend foundation', async () => {
  render(<App />)
  expect(await screen.findByText('AI Governance Middleware')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Foundation ready' })).toBeInTheDocument()
})
