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
import { AgentsPage } from '@/features/integrations/AgentsPage'
import { LandingPage } from './LandingPage'
import { authRoutes, RequireAuth } from '@/components/ui/authentication'
import { RouteErrorPage } from './RouteErrorPage'

// eslint-disable-next-line react-refresh/only-export-components
function ProjectGuard({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams()
  return projectId ? (
    children
  ) : (
    <Navigate to="/projects" replace />
  )
}
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/landing', element: <LandingPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/projects', element: <ProjectsPage /> },
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
              { path: 'agents', element: <AgentsPage /> },
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
        ],
      },
      { path: '*', element: <RouteErrorPage /> },
    ],
  },
  ...authRoutes,
])
