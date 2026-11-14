import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectsPage } from './ProjectsPage'

test('shows the live projects workspace', () => {
  render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  )
  expect(screen.getByText('Your projects')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /add project/i })).toBeInTheDocument()
})

test('opens the project creation form', () => {
  render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  )

  fireEvent.click(screen.getByRole('button', { name: /add project/i }))
  expect(screen.getByLabelText('Project name')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument()
})
