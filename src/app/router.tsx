import { Navigate, createBrowserRouter, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectsPage } from '@/features/dashboard/ProjectsPage'
import { TeamsPage } from '@/features/dashboard/TeamsPage'
import { OverviewPage } from '@/features/dashboard/OverviewPage'
import { ExecutionsPage } from '@/features/dashboard/ExecutionsPage'
import { SettingsPage } from '@/features/dashboard/SettingsPage'
import { ApprovalsPage } from '@/features/human-oversight/ApprovalsPage'
import { ExplainabilityPage } from '@/features/explainability/ExplainabilityPage'
import { ReportsPage } from '@/features/policy-audit/ReportsPage'
import { projects } from '@/features/dashboard/data'

// eslint-disable-next-line react-refresh/only-export-components
function ProjectGuard({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams()
  return projectId && projects.some((project) => project.id === projectId) ? (
    children
  ) : (
    <Navigate to="/" replace />
  )
}
export const router = createBrowserRouter([
  { path: '/', element: <ProjectsPage /> },
  { path: '/teams', element: <TeamsPage /> },
  {
    path: '/projects/:projectId',
    element: (
      <ProjectGuard>
        <AppShell />
      </ProjectGuard>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <OverviewPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'executions', element: <ExecutionsPage /> },
      { path: 'explainability', element: <ExplainabilityPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
  {
    path: '/settings',
    element: <AppShell />,
    children: [{ index: true, element: <SettingsPage /> }],
  },
])
