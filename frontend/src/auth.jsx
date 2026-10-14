import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, hasToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(hasToken())

  useEffect(() => {
    if (!hasToken()) return
    api
      .get('/auth/me')
      .then(setUser)
      .catch(() => setToken(''))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('hkii:logout', onLogout)
    return () => window.removeEventListener('hkii:logout', onLogout)
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await api.post('/auth/login', { username, password })
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    setToken('')
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export const ROLE_LABEL = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  student: 'Học viên',
  parent: 'Phụ huynh',
}
