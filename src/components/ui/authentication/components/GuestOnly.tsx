import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { consumeReturnTo } from '../paths'

export function GuestOnly({ children }: { children?: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading…
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to={consumeReturnTo()} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

