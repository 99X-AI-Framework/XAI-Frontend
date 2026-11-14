/**
 * Frontend routes used by the auth module.
 * The backend redirects to `verify` and `oauthCallback` (see backend/app/routers/auth.py)
 * and links to `login` / `forgotPassword` in emails -- keep them in sync.
 */
export const AUTH_PATHS = {
  login: '/login',
  signup: '/signup',
  verify: '/verify',
  forgotPassword: '/forgot-password',
  oauthCallback: '/auth/callback',
  afterLogin: '/projects',
} as const

const RETURN_TO_KEY = 'xai.auth.returnTo'

/** Only allow same-origin relative paths (prevents open redirects). */
function isSafePath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}

export function rememberReturnTo(path: unknown): void {
  if (isSafePath(path) && !Object.values(AUTH_PATHS).some((p) => path.startsWith(p))) {
    sessionStorage.setItem(RETURN_TO_KEY, path)
  }
}

export function consumeReturnTo(): string {
  const value = sessionStorage.getItem(RETURN_TO_KEY)
  sessionStorage.removeItem(RETURN_TO_KEY)
  return isSafePath(value) ? value : AUTH_PATHS.afterLogin
}

