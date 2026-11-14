import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AUTH_PATHS } from '../paths'

export interface AuthBanner {
  type: 'error' | 'success' | 'info'
  text: string
}

interface AuthLayoutProps {
  icon: ReactNode
  title: string
  subtitle: ReactNode
  activeTab?: 'login' | 'signup'
  banner?: AuthBanner | null
  children: ReactNode
  footer?: ReactNode
}

const BANNER_STYLES: Record<AuthBanner['type'], string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function AuthLayout({ icon, title, subtitle, activeTab, banner, children, footer }: AuthLayoutProps) {
  return (
    <div
      className="auth-page flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 text-slate-900 antialiased"
      style={{
        backgroundImage:
          'radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.06) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(14, 165, 233, 0.06) 0px, transparent 50%)',
      }}
    >
      <div className="auth-card w-full max-w-[390px] rounded-[20px] border border-slate-200 bg-white px-7 py-7 text-center shadow-[0_12px_30px_-4px_rgba(15,23,42,0.07),0_4px_10px_-2px_rgba(15,23,42,0.03)]">
        <div className="mb-4">
          <div className="mb-2.5 inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-slate-900 text-white">
            {icon}
          </div>
          <h1 className="mb-0.5 text-[1.35rem] font-bold tracking-tight text-slate-900">{title}</h1>
          <div className="text-[0.82rem] text-slate-500">{subtitle}</div>
        </div>

        {activeTab && (
          <div className="mb-4 flex rounded-[11px] bg-slate-100 p-[3px]" role="tablist">
            <Link
              to={AUTH_PATHS.login}
              role="tab"
              aria-selected={activeTab === 'login'}
              className={`flex-1 rounded-lg py-1.5 text-center text-[0.82rem] font-semibold transition ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Log In
            </Link>
            <Link
              to={AUTH_PATHS.signup}
              role="tab"
              aria-selected={activeTab === 'signup'}
              className={`flex-1 rounded-lg py-1.5 text-center text-[0.82rem] font-semibold transition ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </Link>
          </div>
        )}

        {banner && (
          <div
            role={banner.type === 'error' ? 'alert' : 'status'}
            className={`mb-3.5 rounded-lg border px-3 py-2 text-left text-[0.8rem] ${BANNER_STYLES[banner.type]}`}
          >
            {banner.text}
          </div>
        )}

        {children}

        {footer && <div className="mt-4 text-[0.78rem] text-slate-500">{footer}</div>}
      </div>
    </div>
  )
}

