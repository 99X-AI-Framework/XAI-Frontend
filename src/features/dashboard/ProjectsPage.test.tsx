import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectsPage } from './ProjectsPage'

test('shows demo projects and project dashboard links', () => {
  render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  )
  expect(screen.getByText('Your projects')).toBeInTheDocument()
  expect(screen.getByText('Atlas Research Network')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Atlas Research Network/i })).toHaveAttribute(
    'href',
    '/projects/atlas-research/dashboard',
  )
})
