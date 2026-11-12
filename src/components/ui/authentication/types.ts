export type OtpPurpose = 'signup' | 'login' | 'oauth' | 'password_reset'
export type OAuthProvider = 'google' | 'github'

export interface AuthUser {
  id: string
  email: string
  name: string
  is_email_verified: boolean
  has_password: boolean
  created_at: string
}

export interface AuthenticatedResponse {
  status: 'authenticated'
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: AuthUser
}

export interface OtpChallenge {
  status: 'otp_required'
  challenge_id: string
  purpose: OtpPurpose
  masked_email: string
  code_length: number
  expires_in: number
  resend_available_in: number
  attempts_remaining: number
  resends_remaining: number
}

export type LoginResult = AuthenticatedResponse | OtpChallenge

export interface SignupPayload {
  name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
  remember: boolean
}

/** Shape of `detail` in every error returned by the auth API. */
export interface ApiErrorDetail {
  code: string
  message: string
  attempts_remaining?: number
  retry_after?: number
}

