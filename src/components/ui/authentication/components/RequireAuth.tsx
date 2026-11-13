import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AUTH_PATHS, rememberReturnTo } from '../paths'

interface RequireAuthProps {
  children?: ReactNode
  fallback?: ReactNode
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      fallback ?? (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Checking session…
        </div>
      )
    )
  }

  if (status === 'unauthenticated') {
    rememberReturnTo(`${location.pathname}${location.search}${location.hash}`)
    return <Navigate to={AUTH_PATHS.login} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

