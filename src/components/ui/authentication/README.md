# Authentication Module (React + FastAPI)

Self-contained authentication workflow inside `src/components/ui/authentication/` featuring:
- **Email + Password** signup, login, and password reset
- **6-digit Email OTP verification** (signup verification, 2FA on login, optional 2FA on OAuth, and password reset)
- **Google (OIDC) & GitHub (OAuth 2.0)** with Authorization Code + PKCE (`S256`) handled server-side
- **Short-lived JWT access tokens (in-memory)** + **rotating opaque refresh tokens (`httpOnly` cookie)** with replay-detection family revocation

---

## Architecture & Security Design

| Concern | Implementation |
| --- | --- |
| Password hashing | Argon2id (`argon2-cffi`) with timing-equalized dummy check for unknown emails |
| OTP storage | HMAC-SHA256 bound to `challenge_id` (`OTP_PEPPER`), never stored in plaintext |
| OTP brute-force guard | Atomic `attempts < 5` increment *before* digest comparison; single-use `consumed_at` |
| Anti-enumeration | Duplicate signup & unknown-email forgot-password return the same `202` `otp_required` decoy shape; emails sent in `BackgroundTasks` |
| Access token | Short-lived HS256 JWT (15 min) held only in React memory (`AuthContext`), never `localStorage` |
| Refresh token | 48-byte opaque token hashed with SHA-256 in DB; `httpOnly` cookie scoped to `/api/v1/auth` |
| Replay protection | Rotating refresh token family; re-using a rotated token (outside 10s grace window) revokes the entire token family |
| CSRF protection | `X-Requested-With: XMLHttpRequest` header + `Origin` check on cookie-authenticated routes (`/refresh`, `/logout`) |
| OAuth security | PKCE (`S256`) + signed `httpOnly` state cookie; pre-account-takeover guard wipes unverified password squatters |

---

## API Contract (`/api/v1/auth`)

| Method & Path | Purpose | Response |
| --- | --- | --- |
| `POST /signup` | Register user + issue `signup` OTP | `202` `OtpChallengeResponse` |
| `POST /login` | Verify password; issue `login` OTP (or session if `LOGIN_OTP_REQUIRED=false`) | `200` `OtpChallengeResponse \| AuthenticatedResponse` |
| `GET /otp/{challenge_id}` | Hydrate `/verify` page on reload | `200` `OtpChallengeResponse` |
| `POST /otp/verify` | Verify OTP code & issue session + refresh cookie | `200` `AuthenticatedResponse` |
| `POST /otp/resend` | Rotate OTP code (30s cooldown, max 5 resends) | `200` `OtpChallengeResponse` |
| `POST /password/forgot` | Issue `password_reset` OTP (decoy if unknown) | `202` `OtpChallengeResponse` |
| `POST /password/reset` | Verify OTP + set new password + revoke all sessions | `204 No Content` |
| `POST /refresh` | Rotate `httpOnly` refresh cookie -> new access token | `200` `AuthenticatedResponse` |
| `POST /logout` | Revoke token family & clear refresh cookie | `204 No Content` |
| `GET /me` | Return current user (requires `Authorization: Bearer`) | `200` `UserOut` |
| `GET /oauth/providers` | List enabled OAuth providers (`["google", "github"]`) | `200` `{ providers }` |
| `GET /oauth/{provider}/authorize` | Start PKCE OAuth redirect | `302` to provider |
| `GET /oauth/{provider}/callback` | Exchange code, link/create user, redirect to SPA | `302` to `/auth/callback` or `/verify` |

---

## Requirements to Enable Google & GitHub OAuth

A provider is automatically enabled when **both** its Client ID and Client Secret are set in `backend/.env`.

### 1. Google OAuth (OIDC)
1. Open [Google Cloud Console -> APIs & Services -> Credentials](https://console.cloud.google.com/apis/credentials).
2. Configure the **OAuth consent screen** (External or Internal) with scopes: `openid`, `email`, `profile`.
3. Create an **OAuth client ID** of type **Web application**.
4. Add **Authorized JavaScript origins**:
   - Dev: `http://localhost:5173`
   - Prod: `https://<your-frontend-domain>`
5. Add **Authorized redirect URIs**:
   - Dev: `http://localhost:8000/api/v1/auth/oauth/google/callback`
   - Prod: `https://<your-backend-domain>/api/v1/auth/oauth/google/callback`
6. Set in `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=<your-client-id>
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```

### 2. GitHub OAuth
1. Open [GitHub Developer Settings -> OAuth Apps](https://github.com/settings/developers) and click **New OAuth App**.
2. Set **Homepage URL**:
   - Dev: `http://localhost:5173`
   - Prod: `https://<your-frontend-domain>`
3. Set **Authorization callback URL**:
   - Dev: `http://localhost:8000/api/v1/auth/oauth/github/callback`
   - Prod: `https://<your-backend-domain>/api/v1/auth/oauth/github/callback`
4. Generate a **Client Secret** and set in `backend/.env`:
   ```env
   GITHUB_CLIENT_ID=<your-client-id>
   GITHUB_CLIENT_SECRET=<your-client-secret>
   ```
   *(The backend requests `read:user user:email` scopes and verifies via `GET /user/emails` that the email is `verified: true`.)*

### 3. Production Requirements
- Set `ENVIRONMENT=production`, `COOKIE_SECURE=true`, `EMAIL_BACKEND=smtp` (with SMTP credentials), and strong random values for `JWT_SECRET` and `OTP_PEPPER` (the app refuses to start in production with dev defaults).
- Serve both frontend and backend over HTTPS and configure `CORS_ORIGINS`, `FRONTEND_URL`, and `BACKEND_URL` to match your production origins.
- Optional: set `OAUTH_REQUIRE_OTP=true` if you also want an email OTP challenge after Google/GitHub sign-in.

---

## Running Locally

### Backend (FastAPI)
From the repository root (where `.venv` and `requirements.txt` live):
```powershell
# Run tests
.venv\Scripts\python.exe -m pytest -c src\components\ui\authentication\backend\pytest.ini src\components\ui\authentication\backend\tests

# Start API server (from backend directory)
cd src\components\ui\authentication\backend
Copy-Item .env.example .env
..\..\..\..\..\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```
In development (`EMAIL_BACKEND=console`), OTP codes are printed directly to the Uvicorn terminal log.

### Wiring into the React App
When ready to mount outside this folder:
1. Wrap `<App />` (or `<RouterProvider />`) with `<AuthProvider>` from `@/components/ui/authentication`.
2. Spread `...authRoutes` into `createBrowserRouter([...authRoutes, ...])` and wrap protected routes with `<RequireAuth />`.

