import type { RouteObject } from 'react-router-dom'
import { GuestOnly } from './components/GuestOnly'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { SignupPage } from './pages/SignupPage'
import { VerifyOtpPage } from './pages/VerifyOtpPage'
import { AUTH_PATHS } from './paths'

export const authRoutes: RouteObject[] = [
  {
    element: <GuestOnly />,
    children: [
      { path: AUTH_PATHS.login, element: <LoginPage /> },
      { path: AUTH_PATHS.signup, element: <SignupPage /> },
      { path: AUTH_PATHS.verify, element: <VerifyOtpPage /> },
      { path: AUTH_PATHS.forgotPassword, element: <ForgotPasswordPage /> },
    ],
  },
  { path: AUTH_PATHS.oauthCallback, element: <OAuthCallbackPage /> },
]

