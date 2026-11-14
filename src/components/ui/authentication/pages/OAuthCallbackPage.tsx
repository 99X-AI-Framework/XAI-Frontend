import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../hooks/useAuth'
import { AUTH_PATHS, consumeReturnTo } from '../paths'

const OAUTH_ERROR_COPY: Record<string, string> = {
  access_denied: 'Sign-in was cancelled at the provider.',
  email_unverified: 'Your provider account does not have a verified email address.',
  state_expired: 'The sign-in session expired. Please try again.',
  invalid_state: 'Security verification failed. Please try again.',
  token_exchange_failed: 'Could not complete sign-in with the provider.',
  profile_fetch_failed: 'Could not read your profile from the provider.',
  provider_error: 'The provider returned an error. Please try again.',
  invalid_request: 'Invalid OAuth callback request.',
}

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshSession } = useAuth()

  const statusParam = searchParams.get('status')
  const errorParam = searchParams.get('error')
  const [errorText, setErrorText] = useState<string | null>(() => {
    if (errorParam) {
      return OAUTH_ERROR_COPY[errorParam] ?? 'Social sign-in failed. Please try again.'
    }
    if (statusParam !== 'success') {
      return 'Unexpected sign-in callback state.'
    }
    return null
  })

  useEffect(() => {
    if (errorParam || statusParam !== 'success') {
      return
    }
    let active = true
    refreshSession().then((res) => {
      if (!active) return
      if (res) {
        navigate(consumeReturnTo(), { replace: true })
      } else {
        setErrorText('Could not establish a session. Please try signing in again.')
      }
    })
    return () => {
      active = false
    }
  }, [errorParam, statusParam, refreshSession, navigate])

  return (
    <AuthLayout
      icon={<ShieldCheck size={20} strokeWidth={2.2} />}
      title={errorText ? 'Sign-in failed' : 'Completing sign-in…'}
      subtitle={errorText ? 'We could not finish signing you in' : 'Establishing your secure session'}
      banner={errorText ? { type: 'error', text: errorText } : null}
    >
      {errorText ? (
        <Link
          to={AUTH_PATHS.login}
          className="flex h-10 w-full items-center justify-center rounded-[10px] bg-slate-900 text-[0.88rem] font-semibold text-white transition hover:bg-slate-800"
        >
          Back to Login
        </Link>
      ) : (
        <div className="py-4 text-sm text-slate-500">Please wait…</div>
      )}
    </AuthLayout>
  )
}

