const AUTH_STORAGE_KEY = 'xai.auth.isAuthenticated'

export function useAuth() {
  const isAuthenticated = window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true'

  return { isAuthenticated }
}
