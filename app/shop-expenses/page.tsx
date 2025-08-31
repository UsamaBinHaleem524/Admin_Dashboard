"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import { shopExpensesAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"

interface ShopExpense {
  id: string
  description: string
  date: string
  amount: number
  currency: "USD" | "PKR" | "SAR"
}

export default function ShopExpensesPage() {
  const [shopExpenses, setShopExpenses] = useState<ShopExpense[]>([])
  const [filteredShopExpenses, setFilteredShopExpenses] = useState<ShopExpense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'PKR' | 'SAR'>("USD")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShopExpense, setEditingShopExpense] = useState<ShopExpense | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; expense: ShopExpense | null }>({
    isOpen: false,
    expense: null,
  })
  const [formData, setFormData] = useState({
    description: "",
    date: new Date().toISOString().split('T')[0],
    amount: "",
    currency: "USD" as "USD" | "PKR" | "SAR",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadShopExpenses()
  }, [])

  useEffect(() => {
    filterShopExpenses()
  }, [shopExpenses, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadShopExpenses = async () => {
    try {
      setLoading(true)
      const data = await shopExpensesAPI.getAll()
      setShopExpenses(data)
    } catch (error) {
      showToast("Failed to load shop expenses", "error")
      console.error("Error loading shop expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterShopExpenses = () => {
    if (!searchTerm) {
      setFilteredShopExpenses(shopExpenses)
    } else {
      const filtered = shopExpenses.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.date.includes(searchTerm) ||
          expense.amount.toString().includes(searchTerm) ||
          expense.currency.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredShopExpenses(filtered)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description || !formData.date || !formData.amount || !formData.currency) {
      showToast("Please fill in all fields", "error")
      return
    }

    const amount = Number.parseFloat(formData.amount)
    if (isNaN(amount) || amount < 0) {
      showToast("Please enter a valid amount", "error")
      return
    }

    const shopExpenseData: ShopExpense = {
      id: editingShopExpense ? editingShopExpense.id : Date.now().toString(),
      description: formData.description,
      date: formData.date,
      amount,
      currency: formData.currency,
    }

    try {
      if (editingShopExpense) {
        await shopExpensesAPI.update(shopExpenseData)
        showToast("Shop expense updated successfully!", "success")
      } else {
        await shopExpensesAPI.create(shopExpenseData)
        showToast("Shop expense added successfully!", "success")
      }
      
      await loadShopExpenses()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save shop expense", "error")
      console.error("Error saving shop expense:", error)
    }
  }

  const handleEdit = (shopExpense: ShopExpense) => {
    setEditingShopExpense(shopExpense)
    setFormData({
      description: shopExpense.description,
      date: shopExpense.date,
      amount: shopExpense.amount.toString(),
      currency: shopExpense.currency || "USD",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await shopExpensesAPI.delete(id)
      await loadShopExpenses()
      showToast("Shop expense deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete shop expense", "error")
      console.error("Error deleting shop expense:", error)
    }
  }

  const openDeleteModal = (expense: ShopExpense) => {
    setDeleteModal({ isOpen: true, expense })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, expense: null })
  }

  const resetForm = () => {
    setFormData({
      description: "",
      date: new Date().toISOString().split('T')[0],
      amount: "",
      currency: "USD",
    })
    setEditingShopExpense(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredShopExpenses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredShopExpenses.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const getCurrencySymbol = (currency: "USD" | "PKR" | "SAR") => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      default: return ""
    }
  }

  const convertToDisplayCurrency = (amount: number, fromCurrency: 'USD' | 'PKR' | 'SAR') => {
    // Simple conversion rates (you might want to use real-time rates in production)
    const conversionRates = {
      USD: { USD: 1, PKR: 280, SAR: 3.75 },
      PKR: { USD: 0.0036, PKR: 1, SAR: 0.013 },
      SAR: { USD: 0.27, PKR: 75, SAR: 1 }
    }
    
    return amount * conversionRates[fromCurrency][displayCurrency]
  }

  const getConvertedTotalAmount = () => {
    return shopExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.amount, expense.currency)
    }, 0)
  }

  const getConvertedAverageAmount = () => {
    if (shopExpenses.length === 0) return 0
    return getConvertedTotalAmount() / shopExpenses.length
  }

  const totalAmount = shopExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shop Expenses</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage shop expenses</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Shop Expense
          </button>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{shopExpenses.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-red-600">{getCurrencySymbol(displayCurrency)}{getConvertedTotalAmount().toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Average Amount</p>
              <p className="text-2xl font-bold text-blue-600">
                {getCurrencySymbol(displayCurrency)}{getConvertedAverageAmount().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Currency Selector */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Display Currency</h3>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as 'USD' | 'PKR' | 'SAR')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="USD">USD - Dollar</option>
              <option value="PKR">PKR - Pakistani Rupee</option>
              <option value="SAR">SAR - Saudi Riyal</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            All totals will be converted and displayed in the selected currency
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by description, date, amount, or currency..."
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
                    Description
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 sm:px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 sm:px-6 py-4 text-center text-gray-500">
                      No shop expenses found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {expense.description}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.date}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.currency}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(expense)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
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
            totalItems={filteredShopExpenses.length}
          />
        )}

        {/* Add/Edit Dialog */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold mb-4">
                {editingShopExpense ? "Edit Shop Expense" : "Add Shop Expense"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter description"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">Dollar (USD)</option>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingShopExpense ? "Update" : "Add"}
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
          onConfirm={() => deleteModal.expense && handleDelete(deleteModal.expense.id)}
          title="Delete Shop Expense"
          message="Are you sure you want to delete this shop expense? This action cannot be undone."
          itemName={deleteModal.expense?.description}
        />
      </div>
    </DashboardLayout>
  )
} 