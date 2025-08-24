'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import Cookies from 'js-cookie'
import { getCurrentUser } from './api'

interface User {
  id: string
  email: string
  isAdmin: boolean
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    
    if (token) {
      getCurrentUser()
        .then(setUser)
        .catch(() => {
          // Token is invalid, remove it
          Cookies.remove('auth_token')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback((userData: User, token: string) => {
    setUser(userData)
    Cookies.set('auth_token', token, { expires: 7 }) // 7 days
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    Cookies.remove('auth_token')
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 