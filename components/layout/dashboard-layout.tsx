"use client"

import type React from "react"
import { useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { Sidebar } from "./sidebar"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main
        className={cn(
          "flex-1 overflow-auto transition-all duration-300", // Offset for sidebar on desktop
          "ml-0" // No offset on mobile (sidebar is fixed and toggleable)
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}