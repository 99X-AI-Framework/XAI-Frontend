import { createBrowserRouter } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import LandingPage from '@/app/LandingPage'
import { RequireAuth, authRoutes, useAuth } from '@/components/ui/authentication'

// eslint-disable-next-line react-refresh/only-export-components
function FoundationPage() {
  const { user, logout } = useAuth()
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">AI Governance Middleware</h1>
        <p className="text-slate-600">Signed in as {user?.email}</p>
        <Button onClick={() => void logout()}>Sign out</Button>
      </section>
    </main>
  )
}
export const router = createBrowserRouter([
  {
    path: '/', element: <LandingPage />
  },
  {
    element: <RequireAuth />,
    children: [{ path: '/', element: <FoundationPage /> }],
  },
  ...authRoutes,
])

