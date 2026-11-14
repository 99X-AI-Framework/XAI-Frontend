import { useEffect, useState } from 'react'
import { authApi } from '../api/authApi'
import type { OAuthProvider } from '../types'

interface OAuthButtonsProps {
  remember?: boolean
  mode: 'signin' | 'signup'
  disabled?: boolean
}

export function OAuthButtons({ remember = false, mode, disabled = false }: OAuthButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvider[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    authApi
      .oauthProviders()
      .then((list) => {
        if (active) setProviders(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (active) {
          setProviders([])
          setUnavailable(true)
        }
      })
    return () => {
      active = false
    }
  }, [])

  // Hide the social section if the backend explicitly reports zero configured providers.
  if (providers !== null && providers.length === 0) {
    return unavailable ? (
      <p className="mb-3 text-left text-xs text-slate-500" role="status">
        Social sign-in is temporarily unavailable. Continue with email instead.
      </p>
    ) : null
  }

  const isEnabled = (p: OAuthProvider) => providers === null || providers.includes(p)
  const verb = mode === 'signin' ? 'Sign in' : 'Sign up'

  const startOAuth = (provider: OAuthProvider) => {
    window.location.assign(authApi.oauthAuthorizeUrl(provider, remember))
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {isEnabled('google') && (
          <button
            type="button"
            disabled={disabled || providers === null}
            onClick={() => startOAuth('google')}
            title={`${verb} with Google`}
            className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white text-[0.82rem] font-semibold text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span>Google</span>
          </button>
        )}

        {isEnabled('github') && (
          <button
            type="button"
            disabled={disabled || providers === null}
            onClick={() => startOAuth('github')}
            title={`${verb} with GitHub`}
            className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white text-[0.82rem] font-semibold text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub</span>
          </button>
        )}
      </div>

      <div className="my-3.5 flex items-center text-[0.75rem] font-medium uppercase tracking-wider text-slate-400 before:mr-3 before:flex-1 before:border-b before:border-slate-200 after:ml-3 after:flex-1 after:border-b after:border-slate-200">
        {mode === 'signin' ? 'Or continue with' : 'Or sign up with email'}
      </div>
    </>
  )
}

