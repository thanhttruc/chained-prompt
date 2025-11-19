import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../api/types'
import { authService } from '../api/auth.service'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>
  logout: () => void
  updateUser: (userData: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Kiểm tra token khi component mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        // Có thể gọi API để verify token và lấy user mới nhất
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password })
      if (response.success && response.data) {
        const { user: userData, accessToken } = response.data
        // Map user data từ response format mới sang User type
        const mappedUser: User = {
          user_id: userData.id,
          full_name: userData.fullName,
          email: userData.email,
          username: userData.email, // Fallback nếu không có username
          total_balance: 0,
        }
        localStorage.setItem('token', accessToken)
        localStorage.setItem('user', JSON.stringify(mappedUser))
        setUser(mappedUser)
      } else {
        throw new Error(response.message || 'Đăng nhập thất bại')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Đăng nhập thất bại')
    }
  }

  const register = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    try {
      const response = await authService.register({ fullName, email, password, confirmPassword })
      // Map user data từ response format mới sang User type
      const mappedUser: User = {
        user_id: response.user.id,
        full_name: response.user.fullName,
        email: response.user.email,
        username: response.user.email, // Fallback nếu không có username
        total_balance: 0,
      }
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(mappedUser))
      setUser(mappedUser)
    } catch (error: any) {
      throw error
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const updateUser = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

