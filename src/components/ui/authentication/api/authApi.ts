import axios, { AxiosError } from 'axios'
import type {
  ApiErrorDetail,
  AuthUser,
  AuthenticatedResponse,
  LoginPayload,
  LoginResult,
  OAuthProvider,
  OtpChallenge,
  SignupPayload,
} from '../types'

export const AUTH_API_BASE = `${(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')}/api/v1/auth`

/**
 * Dedicated client for the auth API:
 *  - withCredentials so the httpOnly refresh cookie is sent / stored
 *  - X-Requested-With satisfies the backend CSRF guard on cookie-authenticated routes
 */
const http = axios.create({
  baseURL: AUTH_API_BASE,
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
})

export class AuthApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail: Partial<ApiErrorDetail>

  constructor(status: number, detail: Partial<ApiErrorDetail> & { message: string; code: string }) {
    super(detail.message)
    this.name = 'AuthApiError'
    this.status = status
    this.code = detail.code
    this.detail = detail
  }
}

function toAuthApiError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) return error
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0
    const detail: unknown = error.response?.data?.detail
    if (detail && typeof detail === 'object' && !Array.isArray(detail) && 'code' in detail) {
      return new AuthApiError(status, detail as ApiErrorDetail)
    }
    if (Array.isArray(detail)) {
      // FastAPI request-validation error (422)
      const first = detail[0] as { msg?: string } | undefined
      return new AuthApiError(status, {
        code: 'validation_error',
        message: first?.msg?.replace(/^Value error, /, '') ?? 'Invalid input.',
      })
    }
    if (status === 0) {
      return new AuthApiError(0, { code: 'network_error', message: 'Cannot reach the server. Check your connection.' })
    }
  }
  return new AuthApiError(500, { code: 'unknown_error', message: 'Something went wrong. Please try again.' })
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toAuthApiError(error)),
)

export function errorMessage(error: unknown): string {
  return toAuthApiError(error).message
}

export const authApi = {
  signup: (body: SignupPayload) => http.post<AuthenticatedResponse>('/signup', body).then((r) => r.data),

  login: (body: LoginPayload) => http.post<LoginResult>('/login', body).then((r) => r.data),

  getChallenge: (challengeId: string) =>
    http.get<OtpChallenge>(`/otp/${encodeURIComponent(challengeId)}`).then((r) => r.data),

  verifyOtp: (challengeId: string, code: string) =>
    http
      .post<AuthenticatedResponse>('/otp/verify', { challenge_id: challengeId, code })
      .then((r) => r.data),

  resendOtp: (challengeId: string) =>
    http.post<OtpChallenge>('/otp/resend', { challenge_id: challengeId }).then((r) => r.data),

  forgotPassword: (email: string) =>
    http.post<OtpChallenge>('/password/forgot', { email }).then((r) => r.data),

  resetPassword: (challengeId: string, code: string, newPassword: string) =>
    http
      .post<void>('/password/reset', { challenge_id: challengeId, code, new_password: newPassword })
      .then(() => undefined),

  refresh: () => http.post<AuthenticatedResponse>('/refresh').then((r) => r.data),

  logout: () => http.post<void>('/logout').then(() => undefined),

  me: (accessToken: string) =>
    http
      .get<AuthUser>('/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.data),

  oauthProviders: () =>
    http.get<{ providers: OAuthProvider[] }>('/oauth/providers').then((r) => r.data.providers),

  /** Full-page navigation target; the backend redirects on to Google/GitHub. */
  oauthAuthorizeUrl: (provider: OAuthProvider, remember: boolean) =>
    `${AUTH_API_BASE}/oauth/${provider}/authorize?remember=${remember ? 'true' : 'false'}`,
}

