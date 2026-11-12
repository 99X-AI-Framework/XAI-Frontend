import { createBrowserRouter } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

// eslint-disable-next-line react-refresh/only-export-components
function FoundationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">AI Governance Middleware</h1>
        <p className="text-slate-600">Frontend foundation ready for feature development.</p>
        <Button>Foundation ready</Button>
      </section>
    </main>
  )
}
export const router = createBrowserRouter([{ path: '/', element: <FoundationPage /> }])
