import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthApiError, authApi } from '../api/authApi'
import type { AuthUser, AuthenticatedResponse } from '../types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  setAuthenticated: (auth: AuthenticatedResponse) => void
  refreshSession: () => Promise<AuthenticatedResponse | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const refreshTimerRef = useRef<number | null>(null)
  // Deduplicate concurrent refresh calls (e.g. React StrictMode double-mount or multi-401).
  const inFlightRefreshRef = useRef<Promise<AuthenticatedResponse | null> | null>(null)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const clearSession = useCallback(() => {
    clearRefreshTimer()
    setAccessToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [clearRefreshTimer])

  const refreshSession = useCallback(async (): Promise<AuthenticatedResponse | null> => {
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current
    }

    const promise = (async () => {
      try {
        const res = await authApi.refresh()
        setAccessToken(res.access_token)
        setUser(res.user)
        setStatus('authenticated')
        return res
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 409) {
          // Another tab/request just rotated the refresh cookie; retry once.
          try {
            const retryRes = await authApi.refresh()
            setAccessToken(retryRes.access_token)
            setUser(retryRes.user)
            setStatus('authenticated')
            return retryRes
          } catch {
            clearSession()
            return null
          }
        }
        clearSession()
        return null
      } finally {
        inFlightRefreshRef.current = null
      }
    })()

    inFlightRefreshRef.current = promise
    return promise
  }, [clearSession])

  const scheduleRefresh = useCallback(
    (expiresInSeconds: number) => {
      clearRefreshTimer()
      // Refresh 60s before expiry (or at half-life for very short dev TTLs).
      const leadSeconds = expiresInSeconds > 90 ? expiresInSeconds - 60 : Math.max(10, Math.floor(expiresInSeconds / 2))
      refreshTimerRef.current = window.setTimeout(() => {
        void refreshSession().then((res) => {
          if (res) {
            scheduleRefresh(res.expires_in)
          }
        })
      }, leadSeconds * 1000)
    },
    [clearRefreshTimer, refreshSession],
  )

  const setAuthenticated = useCallback(
    (auth: AuthenticatedResponse) => {
      setAccessToken(auth.access_token)
      setUser(auth.user)
      setStatus('authenticated')
      scheduleRefresh(auth.expires_in)
    },
    [scheduleRefresh],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  useEffect(() => {
    let active = true
    void refreshSession().then((res) => {
      if (active && res) {
        scheduleRefresh(res.expires_in)
      }
    })
    return () => {
      active = false
      clearRefreshTimer()
    }
  }, [refreshSession, scheduleRefresh, clearRefreshTimer])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      setAuthenticated,
      refreshSession,
      logout,
    }),
    [status, user, accessToken, setAuthenticated, refreshSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}

