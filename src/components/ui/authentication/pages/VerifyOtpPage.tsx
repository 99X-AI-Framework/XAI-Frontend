import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthApiError, authApi, errorMessage } from '../api/authApi'
import { AuthLayout } from '../components/AuthLayout'
import type { AuthBanner } from '../components/AuthLayout'
import { OtpInput } from '../components/OtpInput'
import { useAuth } from '../hooks/useAuth'
import { AUTH_PATHS, consumeReturnTo } from '../paths'
import type { OtpChallenge } from '../types'

export function VerifyOtpPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { setAuthenticated } = useAuth()

  const challengeId = searchParams.get('challenge') ?? ''
  const initialChallenge = (location.state as { challenge?: OtpChallenge } | null)?.challenge ?? null

  const [challenge, setChallenge] = useState<OtpChallenge | null>(
    initialChallenge?.challenge_id === challengeId ? initialChallenge : null,
  )
  const [loadingChallenge, setLoadingChallenge] = useState(!challenge && Boolean(challengeId))
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(initialChallenge?.resend_available_in ?? 0)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [locked, setLocked] = useState(false)
  const [banner, setBanner] = useState<AuthBanner | null>(null)

  useEffect(() => {
    if (!challengeId || challenge) return
    let active = true
    authApi
      .getChallenge(challengeId)
      .then((data) => {
        if (!active) return
        setChallenge(data)
        setCooldown(data.resend_available_in)
      })
      .catch((err) => {
        if (!active) return
        setBanner({ type: 'error', text: errorMessage(err) })
      })
      .finally(() => {
        if (active) setLoadingChallenge(false)
      })
    return () => {
      active = false
    }
  }, [challengeId, challenge])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((s) => (s > 1 ? s - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const codeLength = challenge?.code_length ?? 6

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!challengeId) return
    if (code.length !== codeLength) {
      setBanner({ type: 'error', text: `Please enter all ${codeLength} digits of the verification code.` })
      return
    }

    setBanner(null)
    setSubmitting(true)
    try {
      const auth = await authApi.verifyOtp(challengeId, code)
      setAuthenticated(auth)
      navigate(consumeReturnTo(), { replace: true })
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.code === 'otp_locked' || err.code === 'challenge_invalid') {
          setLocked(true)
        }
        if (err.code === 'otp_invalid' && typeof err.detail.attempts_remaining === 'number') {
          setBanner({
            type: 'error',
            text: `${err.message} (${err.detail.attempts_remaining} ${
              err.detail.attempts_remaining === 1 ? 'attempt' : 'attempts'
            } remaining)`,
          })
          setCode('')
          return
        }
      }
      setBanner({ type: 'error', text: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!challengeId || cooldown > 0 || resending || locked) return
    setBanner(null)
    setResending(true)
    try {
      const updated = await authApi.resendOtp(challengeId)
      setChallenge(updated)
      setCooldown(updated.resend_available_in)
      setCode('')
      setBanner({ type: 'success', text: 'A fresh verification code has been dispatched.' })
    } catch (err) {
      if (err instanceof AuthApiError && err.code === 'resend_cooldown' && err.detail.retry_after) {
        setCooldown(err.detail.retry_after)
      }
      setBanner({ type: 'error', text: errorMessage(err) })
    } finally {
      setResending(false)
    }
  }

  if (!challengeId) {
    return (
      <AuthLayout
        icon={<Lock size={20} strokeWidth={2.2} />}
        title="Verification session missing"
        subtitle="Please start from the sign-in or sign-up page."
        banner={{ type: 'error', text: 'No verification challenge was provided.' }}
        footer={
          <Link to={AUTH_PATHS.login} className="text-slate-500 hover:text-slate-900 hover:underline">
            &larr; Back to login
          </Link>
        }
      >
        <Link
          to={AUTH_PATHS.login}
          className="flex h-10 w-full items-center justify-center rounded-[10px] bg-slate-900 text-[0.88rem] font-semibold text-white transition hover:bg-slate-800"
        >
          Go to Login
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      icon={<Lock size={20} strokeWidth={2.2} />}
      title="Verification code"
      subtitle={
        loadingChallenge ? (
          'Loading verification details…'
        ) : (
          <>
            <p>We sent a {codeLength}-digit verification code to</p>
            {challenge?.masked_email && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[0.8rem] font-semibold text-slate-900">
                <span>{challenge.masked_email}</span>
              </div>
            )}
          </>
        )
      }
      banner={banner}
      footer={
        <Link to={AUTH_PATHS.login} className="text-slate-500 hover:text-slate-900 hover:underline">
          &larr; Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit}>
        <OtpInput
          length={codeLength}
          value={code}
          onChange={setCode}
          disabled={loadingChallenge || submitting || locked}
        />

        <button
          type="submit"
          disabled={loadingChallenge || submitting || locked}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-slate-900 text-[0.88rem] font-semibold text-white transition hover:-translate-y-[1px] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{submitting ? 'Verifying…' : 'Verify & Continue →'}</span>
        </button>
      </form>

      <div className="mt-4 text-[0.8rem] text-slate-500">
        Didn&apos;t receive code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending || locked || (challenge?.resends_remaining ?? 1) <= 0}
          className="font-semibold text-slate-900 underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
        </button>
      </div>
    </AuthLayout>
  )
}

