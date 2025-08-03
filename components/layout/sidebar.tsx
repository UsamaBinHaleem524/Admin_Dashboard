"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, Package, Users, Truck, LogOut, Menu, X } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Purchases", href: "/purchases", icon: Package },
  { name: "Customer Ledger", href: "/customer-ledger", icon: Users },
  { name: "Supplier Ledger", href: "/supplier-ledger", icon: Truck },
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Hamburger menu for mobile */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-md"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-gray-800 text-white min-h-screen transition-all duration-300",
          "lg:w-64 lg:static lg:translate-x-0", // Desktop: fixed width, static position
          isOpen ? "w-64 fixed top-0 left-0 z-40" : "w-0 -translate-x-full fixed top-0 left-0 z-40", // Mobile: toggle width and position
          "overflow-hidden lg:overflow-visible" // Prevent content overflow on mobile
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-center h-16 bg-gray-900">
          <h1 className="text-xl font-bold max-sm:mt-[10px] max-sm:ml-[47px]">Admin Dashboard</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)} // Close sidebar on link click (mobile)
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4">
          <button
            onClick={() => {
              logout()
              setIsOpen(false) // Close sidebar on logout (mobile)
            }}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700 bg-transparent transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
    </>
  )
}