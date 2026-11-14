import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, errorMessage } from '../api/authApi'
import { AuthLayout } from '../components/AuthLayout'
import type { AuthBanner } from '../components/AuthLayout'
import { OAuthButtons } from '../components/OAuthButtons'
import { AUTH_PATHS } from '../paths'
import { useAuth } from '../hooks/useAuth'

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
    return 'Password must contain at least one letter and one number.'
  }
  return null
}

export function SignupPage() {
  const navigate = useNavigate()
  const { setAuthenticated } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState<AuthBanner | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBanner(null)

    const pwdError = validatePassword(password)
    if (pwdError) {
      setBanner({ type: 'error', text: pwdError })
      return
    }
    if (!agreed) {
      setBanner({ type: 'error', text: 'Please agree to the Terms & Privacy policy to continue.' })
      return
    }

    setSubmitting(true)
    try {
      const auth = await authApi.signup({ name: name.trim(), email: email.trim(), password })
      setAuthenticated(auth)
      navigate('/', { replace: true })
    } catch (err) {
      setBanner({ type: 'error', text: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      icon={<UserPlus size={20} strokeWidth={2.2} />}
      title="Create account"
      subtitle="Start your journey in seconds"
      activeTab="signup"
      banner={banner}
      footer={
        <>
          Already have an account?{' '}
          <Link to={AUTH_PATHS.login} className="font-semibold text-slate-900 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <OAuthButtons mode="signup" disabled={submitting} />

      <form onSubmit={handleSubmit}>
        <div className="mb-3 text-left">
          <label htmlFor="signup-name" className="mb-1 block text-[0.78rem] font-semibold text-slate-700">
            Full name
          </label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-slate-400">
              <User size={15} />
            </span>
            <input
              id="signup-name"
              type="text"
              required
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-9 pr-3 text-[0.88rem] text-slate-900 transition focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="mb-3 text-left">
          <label htmlFor="signup-email" className="mb-1 block text-[0.78rem] font-semibold text-slate-700">
            Email address
          </label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-slate-400">
              <Mail size={15} />
            </span>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-9 pr-3 text-[0.88rem] text-slate-900 transition focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="mb-3 text-left">
          <label htmlFor="signup-password" className="mb-1 block text-[0.78rem] font-semibold text-slate-700">
            Password
          </label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-slate-400">
              <Lock size={15} />
            </span>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Create password (min 8 chars, letters + numbers)"
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
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-slate-900"
            />
            <span>
              I agree to{' '}
              <a href="#terms" onClick={(e) => e.preventDefault()} className="font-medium text-slate-900 hover:underline">
                Terms
              </a>{' '}
              &amp;{' '}
              <a href="#privacy" onClick={(e) => e.preventDefault()} className="font-medium text-slate-900 hover:underline">
                Privacy
              </a>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-slate-900 text-[0.88rem] font-semibold text-white transition hover:-translate-y-[1px] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{submitting ? 'Creating account…' : 'Create Account →'}</span>
        </button>
      </form>
    </AuthLayout>
  )
}

