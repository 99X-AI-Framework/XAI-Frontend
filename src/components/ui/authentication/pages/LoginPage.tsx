import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, errorMessage } from '../api/authApi'
import { AuthLayout } from '../components/AuthLayout'
import type { AuthBanner } from '../components/AuthLayout'
import { OAuthButtons } from '../components/OAuthButtons'
import { useAuth } from '../hooks/useAuth'
import { AUTH_PATHS, consumeReturnTo } from '../paths'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState<AuthBanner | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBanner(null)
    setSubmitting(true)
    try {
      const res = await authApi.login({ email: email.trim(), password, remember })
      if (res.status === 'authenticated') {
        setAuthenticated(res)
        navigate(consumeReturnTo(), { replace: true })
        return
      }
      navigate(`${AUTH_PATHS.verify}?challenge=${encodeURIComponent(res.challenge_id)}`, {
        state: { challenge: res },
      })
    } catch (err) {
      setBanner({ type: 'error', text: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      icon={<Lock size={20} strokeWidth={2.2} />}
      title="Welcome back"
      subtitle="Enter your details to sign in"
      activeTab="login"
      banner={banner}
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to={AUTH_PATHS.signup} className="font-semibold text-slate-900 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <OAuthButtons mode="signin" remember={remember} disabled={submitting} />

      <form onSubmit={handleSubmit} noValidate={false}>
        <div className="mb-3 text-left">
          <label htmlFor="login-email" className="mb-1 block text-[0.78rem] font-semibold text-slate-700">
            Email address
          </label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-slate-400">
              <Mail size={15} />
            </span>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-9 pr-3 text-[0.88rem] text-slate-900 transition focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="mb-3 text-left">
          <label htmlFor="login-password" className="mb-1 block text-[0.78rem] font-semibold text-slate-700">
            Password
          </label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-slate-400">
              <Lock size={15} />
            </span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-9 pr-10 text-[0.88rem] text-slate-900 transition focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 p-1 text-slate-400 transition hover:text-slate-900"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="mb-4 mt-1 flex items-center justify-between text-[0.78rem] text-slate-500">
          <label className="flex cursor-pointer select-none items-center gap-1.5">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-slate-900"
            />
            <span>Remember for 30 days</span>
          </label>
          <Link to={AUTH_PATHS.forgotPassword} className="font-medium text-slate-900 hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-slate-900 text-[0.88rem] font-semibold text-white transition hover:-translate-y-[1px] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{submitting ? 'Signing in…' : 'Sign In'}</span>
        </button>
      </form>
    </AuthLayout>
  )
}

