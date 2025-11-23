"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Search, Eye, Plus } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn, formatDisplayDate } from "@/lib/utils"
import { supplierTransactionsAPI } from "@/lib/api"
import { Pagination } from "@/components/ui/pagination"
import { useRouter } from "next/navigation"

interface Supplier {
  name: string
  totalTransactions: number
  totalDebit: number
  totalCredit: number
  currentBalance: number
  currency: string
  lastTransactionDate: string
}

export default function SupplierLedgerPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState("")
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    loadSuppliers()
  }, [])

  useEffect(() => {
    filterSuppliers()
  }, [suppliers, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const transactions = await supplierTransactionsAPI.getAll()
      
      // Sort transactions by date to ensure we get the most recent balance
      const sortedTransactions = transactions.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      // Group transactions by supplier
      const supplierMap = new Map<string, Supplier>()
      
      sortedTransactions.forEach((transaction: any) => {
        const supplierName = transaction.supplier
        const currency = transaction.currency
        
        if (!supplierMap.has(supplierName)) {
          supplierMap.set(supplierName, {
            name: supplierName,
            totalTransactions: 0,
            totalDebit: 0,
            totalCredit: 0,
            currentBalance: 0,
            currency: currency,
            lastTransactionDate: transaction.date
          })
        }
        
        const supplier = supplierMap.get(supplierName)!
        supplier.totalTransactions += 1
        supplier.totalDebit += transaction.debit || 0
        supplier.totalCredit += transaction.credit || 0
        
        // Always update to the latest balance since transactions are sorted by date
        supplier.currentBalance = transaction.balance || 0
        supplier.lastTransactionDate = transaction.date
      })
      
      const supplierList = Array.from(supplierMap.values())
      setSuppliers(supplierList)
    } catch (error) {
      showToast("Failed to load suppliers", "error")
      console.error("Error loading suppliers:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterSuppliers = () => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers)
    } else {
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSuppliers(filtered)
    }
  }

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      case "CNY": return "¥"
      default: return ""
    }
  }

  const handleViewSupplier = (supplierName: string) => {
    router.push(`/supplier-ledger/${encodeURIComponent(supplierName)}`)
  }

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      showToast("Please enter a supplier name", "error")
      return
    }

    try {
      // Create a new supplier by adding a dummy transaction
      await supplierTransactionsAPI.create({
        id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        supplier: newSupplierName.trim(),
        description: "Initial supplier setup",
        date: new Date().toISOString().split('T')[0],
        currency: "USD",
        debit: 0,
        credit: 0,
        balance: 0,
      })
      
      showToast("Supplier added successfully", "success")
      setNewSupplierName("")
      setIsAddSupplierDialogOpen(false)
      await loadSuppliers()
    } catch (error) {
      showToast("Failed to add supplier", "error")
      console.error("Error adding supplier:", error)
    }
  }

  const openAddSupplierDialog = () => {
    setNewSupplierName("")
    setIsAddSupplierDialogOpen(true)
  }

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredSuppliers.slice(startIndex, endIndex)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading suppliers...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Supplier Ledger</h1>
            <p className="text-sm sm:text-base text-gray-600">View supplier accounts and their transaction summaries</p>
          </div>
          <button
            onClick={openAddSupplierDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by supplier name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:max-w-[32%] flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier Name
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Transactions
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Debit
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Credit
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Balance
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Transaction
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No suppliers found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((supplier) => (
                    <tr key={supplier.name} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {supplier.name}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {supplier.totalTransactions}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-red-600 text-sm sm:text-base">
                        {supplier.totalDebit > 0 ? `${getCurrencySymbol(supplier.currency)}${supplier.totalDebit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-green-600 text-sm sm:text-base">
                        {supplier.totalCredit > 0 ? `${getCurrencySymbol(supplier.currency)}${supplier.totalCredit.toFixed(2)}` : "-"}
                      </td>
                      <td
                        className={cn(
                          "px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-sm sm:text-base",
                          supplier.currentBalance < 0 ? "text-red-800" : "text-green-800"
                        )}
                      >
                        {getCurrencySymbol(supplier.currency)}{supplier.currentBalance.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {formatDisplayDate(supplier.lastTransactionDate)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                          onClick={() => handleViewSupplier(supplier.name)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                          </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Dialog */}
      {isAddSupplierDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Supplier</h2>
              <p className="text-sm text-gray-500 mt-1">Create a new supplier account</p>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleAddSupplier(); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter supplier name"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Add Supplier
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierDialogOpen(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
