"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/components/toast-provider"

interface AuthContextType {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()

  useEffect(() => {
    // Check if user is authenticated from session storage
    const authStatus = sessionStorage.getItem("isAuthenticated")
    if (authStatus === "true") {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && pathname !== "/login" && pathname !== "/") {
        router.push("/login")
      }
    }
  }, [isAuthenticated, pathname, router, isLoading])

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true)
        sessionStorage.setItem("isAuthenticated", "true")
        sessionStorage.setItem("user", JSON.stringify(data.user))
        showToast("Login successful!", "success")
        router.push("/dashboard")
        return true
      } else {
        showToast(data.error || "Invalid credentials!", "error")
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      showToast("An error occurred during login", "error")
      return false
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem("isAuthenticated")
    sessionStorage.removeItem("user")
    showToast("Logged out successfully!", "success")
    router.push("/login")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={{ isAuthenticated, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
