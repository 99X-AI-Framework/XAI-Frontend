import { fireEvent, render, screen } from '@testing-library/react'
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

test('opens the project form in a modal and closes it from the dialog controls', () => {
  render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  )

  fireEvent.click(screen.getByRole('button', { name: /add project/i }))
  expect(screen.getByRole('dialog', { name: /create a new project/i })).toBeInTheDocument()
  expect(screen.getByLabelText('Project name')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /close dialog/i }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
