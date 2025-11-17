"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn, formatDisplayDate } from "@/lib/utils"
import { supplierTransactionsAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"

interface SupplierTransaction {
  id: string
  supplier: string
  description: string
  date: string
  currency: "USD" | "PKR" | "SAR" | "CNY"
  debit?: number
  credit?: number
  balance?: number
  createdAt?: string
  updatedAt?: string
}

export default function SupplierLedgerPage() {
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<SupplierTransaction[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<SupplierTransaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; transaction: SupplierTransaction | null }>({
    isOpen: false,
    transaction: null,
  })
  const [formData, setFormData] = useState({
    supplier: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    currency: "USD" as "USD" | "PKR" | "SAR" | "CNY",
    debit: "",
    credit: "",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await supplierTransactionsAPI.getAll()
      setTransactions(data)
    } catch (error) {
      showToast("Failed to load transactions", "error")
      console.error("Error loading transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    if (!searchTerm) {
      setFilteredTransactions(transactions)
    } else {
      const filtered = transactions.filter(
        (transaction) =>
          transaction.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.date.includes(searchTerm) ||
          transaction.currency.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTransactions(filtered)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier || !formData.description || !formData.date || !formData.currency) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const debit = Number.parseFloat(formData.debit) || 0
    const credit = Number.parseFloat(formData.credit) || 0

    if (debit === 0 && credit === 0) {
      showToast("Please enter either a debit or credit amount", "error")
      return
    }

    if (debit > 0 && credit > 0) {
      showToast("Please enter either debit OR credit, not both", "error")
      return
    }

    const transactionData: SupplierTransaction = {
      id: editingTransaction ? editingTransaction.id : Date.now().toString(),
      supplier: formData.supplier,
      description: formData.description,
      date: formData.date,
      currency: formData.currency,
      debit: debit || 0,
      credit: credit || 0,
      balance: 0, // This will be calculated by the API
    }

    try {
      if (editingTransaction) {
        await supplierTransactionsAPI.update(transactionData)
        showToast("Transaction updated successfully!", "success")
      } else {
        await supplierTransactionsAPI.create(transactionData)
        showToast("Transaction added successfully!", "success")
      }
      
      await loadTransactions()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save transaction", "error")
      console.error("Error saving transaction:", error)
    }
  }

  const handleEdit = (transaction: SupplierTransaction) => {
    setEditingTransaction(transaction)
    setFormData({
      supplier: transaction.supplier,
      description: transaction.description,
      date: transaction.date,
      currency: transaction.currency,
      debit: (transaction.debit || 0).toString(),
      credit: (transaction.credit || 0).toString(),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await supplierTransactionsAPI.delete(id)
      await loadTransactions()
      showToast("Transaction deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete transaction", "error")
      console.error("Error deleting transaction:", error)
    }
  }

  const openDeleteModal = (transaction: SupplierTransaction) => {
    setDeleteModal({ isOpen: true, transaction })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, transaction: null })
  }

  const resetForm = () => {
    setFormData({
      supplier: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      currency: "USD",
      debit: "",
      credit: "",
    })
    setEditingTransaction(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const getCurrencySymbol = (currency: "USD" | "PKR" | "SAR" | "CNY") => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      case "CNY": return "¥"
      default: return ""
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Supplier Ledger</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage supplier transactions and balances</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by supplier, description, date, or currency..."
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
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {formatDisplayDate(transaction.date)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {transaction.supplier}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm sm:text-base">
                        {transaction.description}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {transaction.currency}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-red-600 text-sm sm:text-base">
                        {(transaction.debit || 0) > 0 ? `${getCurrencySymbol(transaction.currency)}${(transaction.debit || 0).toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-green-600 text-sm sm:text-base">
                        {(transaction.credit || 0) > 0 ? `${getCurrencySymbol(transaction.currency)}${(transaction.credit || 0).toFixed(2)}` : "-"}
                      </td>
                      <td
                        className={cn(
                          "px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-sm sm:text-base",
                          (transaction.balance || 0) < 0 ? "text-red-800" : "text-green-800"
                        )}
                      >
                        {getCurrencySymbol(transaction.currency)}{(transaction.balance || 0).toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(transaction)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredTransactions.length}
          />
        )}

        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center !mt-0 z-50 px-4 sm:px-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <input
                    id="supplier"
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Enter supplier name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency *
                  </label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" | "CNY" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  >
                    <option value="USD">Dollar (USD)</option>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                    <option value="CNY">Chinese Yuan (CNY)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="debit" className="block text-sm font-medium text-gray-700 mb-1">
                    Debit Amount
                  </label>
                  <input
                    id="debit"
                    type="number"
                    step="0.01"
                    value={formData.debit}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ 
                        ...formData, 
                        debit: value,
                        credit: value ? "" : formData.credit // Clear credit if debit is entered
                      })
                    }}
                    placeholder="Enter debit amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="credit" className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Amount
                  </label>
                  <input
                    id="credit"
                    type="number"
                    step="0.01"
                    value={formData.credit}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ 
                        ...formData, 
                        credit: value,
                        debit: value ? "" : formData.debit // Clear debit if credit is entered
                      })
                    }}
                    placeholder="Enter credit amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base"
                  >
                    {editingTransaction ? "Update" : "Add"} Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={() => deleteModal.transaction && handleDelete(deleteModal.transaction.id)}
          title="Delete Transaction"
          message="Are you sure you want to delete this transaction? This action cannot be undone."
        />
      </div>
    </DashboardLayout>
  )
}