import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthApiError, authApi, errorMessage } from '../api/authApi'
import { AuthLayout } from '../components/AuthLayout'
import type { AuthBanner } from '../components/AuthLayout'
import { OtpInput } from '../components/OtpInput'
import { AUTH_PATHS } from '../paths'
import type { OtpChallenge } from '../types'

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')
  const [email, setEmail] = useState('')
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner] = useState<AuthBanner | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((s) => (s > 1 ? s - 1 : 0)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault()
    setBanner(null)
    setSubmitting(true)
    try {
      const res = await authApi.forgotPassword(email.trim())
      setChallenge(res)
      setCooldown(res.resend_available_in)
      setStep('reset')
      setBanner({
        type: 'info',
        text: 'If an account exists for that email, a reset code has been sent.',
      })
    } catch (err) {
      setBanner({ type: 'error', text: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    if (!challenge) return
    if (code.length !== challenge.code_length) {
      setBanner({ type: 'error', text: `Please enter all ${challenge.code_length} digits.` })
      return
    }
    setBanner(null)
    setSubmitting(true)
    try {
      await authApi.resetPassword(challenge.challenge_id, code, newPassword)
      setStep('done')
      setBanner({ type: 'success', text: 'Your password has been updated. All existing sessions were signed out.' })
    } catch (err) {
      if (err instanceof AuthApiError && err.code === 'otp_invalid') {
        setCode('')
      }
      setBanner({ type: 'error', text: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!challenge || cooldown > 0) return
    setBanner(null)
    try {
      const updated = await authApi.resendOtp(challenge.challenge_id)
      setChallenge(updated)
      setCooldown(updated.resend_available_in)
      setBanner({ type: 'success', text: 'A fresh reset code has been sent.' })
    } catch (err) {
      setBanner({ type: 'error', text: errorMessage(err) })
    }
  }

  return (
    <AuthLayout
      icon={<KeyRound size={20} strokeWidth={2.2} />}
      title={step === 'done' ? 'Password updated' : 'Reset password'}
      subtitle={
        step === 'request'
          ? 'Enter your email to receive a 6-digit reset code'
          : step === 'reset'
            ? `Enter the code sent to ${challenge?.masked_email ?? email}`
            : 'You can now sign in with your new password'
      }
      banner={banner}
      footer={
        <Link to={AUTH_PATHS.login} className="text-slate-500 hover:text-slate-900 hover:underline">
          &larr; Back to login
        </Link>
      }
    >
      {step === 'request' && (
        <form onSubmit={handleRequest}>
          <div className="mb-4 text-left">
            <label htmlFor="forgot-email" className="mb-1 block text-[0.78rem] font-semibold text-slate-700">
              Email address
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-slate-400">
                <Mail size={15} />
              </span>
              <input
                id="forgot-email"
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
          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center rounded-[10px] bg-slate-900 text-[0.88rem] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send Reset Code →'}
          </button>
        </form>
      )}

      {step === 'reset' && challenge && (
        <form onSubmit={handleReset}>
          <OtpInput length={challenge.code_length} value={code} onChange={setCode} disabled={submitting} />

          <div className="mb-4 text-left">
            <label htmlFor="reset-password" className="mb-1 block text-[0.78rem] font-semibold text-slate-700">
              New password
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-slate-400">
                <Lock size={15} />
              </span>
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min 8 chars, letters + numbers"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-9 pr-10 text-[0.88rem] text-slate-900 transition focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-900"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center rounded-[10px] bg-slate-900 text-[0.88rem] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? 'Updating…' : 'Reset Password →'}
          </button>

          <div className="mt-4 text-[0.8rem] text-slate-500">
            Didn&apos;t receive code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="font-semibold text-slate-900 underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <Link
          to={AUTH_PATHS.login}
          className="flex h-10 w-full items-center justify-center rounded-[10px] bg-slate-900 text-[0.88rem] font-semibold text-white transition hover:bg-slate-800"
        >
          Sign In →
        </Link>
      )}
    </AuthLayout>
  )
}

