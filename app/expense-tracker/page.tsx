"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import { expensesAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"

interface Expense {
  id: string
  description: string
  date: string
  amount: number
  currency: "USD" | "PKR" | "SAR"
}

export default function ExpenseTrackerPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'PKR' | 'SAR'>("USD")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; expense: Expense | null }>({
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
    loadExpenses()
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [expenses, searchTerm, selectedDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedDate])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const data = await expensesAPI.getAll()
      setExpenses(data)
    } catch (error) {
      showToast("Failed to load expenses", "error")
      console.error("Error loading expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterExpenses = () => {
    let filtered = expenses
    
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.date.includes(searchTerm) ||
        expense.currency.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (selectedDate) {
      filtered = filtered.filter(expense => expense.date === selectedDate)
    }
    
    setFilteredExpenses(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description || !formData.date || !formData.amount || isNaN(parseFloat(formData.amount))) {
      showToast("Please fill in all fields with valid data", "error")
      return
    }

    const amount = parseFloat(formData.amount)
    if (amount < 0) {
      showToast("Amount cannot be negative", "error")
      return
    }

    try {
      if (editingExpense) {
        await expensesAPI.update({
          id: editingExpense.id,
          description: formData.description,
          date: formData.date,
          amount: amount,
          currency: formData.currency,
        })
        showToast("Expense updated successfully!", "success")
      } else {
        await expensesAPI.create({
          description: formData.description,
          date: formData.date,
          amount: amount,
          currency: formData.currency,
        })
        showToast("Expense added successfully!", "success")
      }
      
      await loadExpenses()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save expense", "error")
      console.error("Error saving expense:", error)
    }
  }

  const handleEdit = (expense: Expense) => {
    setFormData({
      description: expense.description,
      date: expense.date,
      amount: expense.amount.toString(),
      currency: expense.currency,
    })
    setEditingExpense(expense)
    setIsDialogOpen(true)
  }

  const handleDelete = async (expense: Expense) => {
    try {
      await expensesAPI.delete(expense.id)
      await loadExpenses()
      showToast("Expense deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete expense", "error")
      console.error("Error deleting expense:", error)
    }
  }

  const openDeleteModal = (expense: Expense) => {
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
    setEditingExpense(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Currency conversion functions
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD': return '$'
      case 'PKR': return '₨'
      case 'SAR': return 'ر.س'
      default: return '$'
    }
  }

  const convertToDisplayCurrency = (amount: number, fromCurrency: string) => {
    if (fromCurrency === displayCurrency) return amount
    
    const conversionRates: Record<string, Record<string, number>> = {
      USD: { USD: 1, PKR: 280, SAR: 3.75 },
      PKR: { USD: 0.0036, PKR: 1, SAR: 0.013 },
      SAR: { USD: 0.27, PKR: 75, SAR: 1 }
    }
    
    return amount * (conversionRates[fromCurrency]?.[displayCurrency] || 1)
  }

  // Calculate totals
  const getTotalAmount = () => {
    return filteredExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.amount, expense.currency)
    }, 0)
  }

  const getTotalExpenses = () => {
    return filteredExpenses.length
  }

  const getAverageAmount = () => {
    if (filteredExpenses.length === 0) return 0
    return getTotalAmount() / filteredExpenses.length
  }

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredExpenses.slice(startIndex, endIndex)

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Goods Expense</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage expense records</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">
                {getCurrencySymbol(displayCurrency)}{getTotalAmount().toFixed(2)}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by description, or currency"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="sm:max-w-[32%] flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
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
                      No expenses found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {expense.date}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm sm:text-base">
                        {expense.description}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {expense.currency}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(expense)}
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
            <div className="md:hidden divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  {loading ? "Loading..." : "No expenses found"}
                </div>
              ) : (
                currentItems.map((expense) => (
                  <div key={expense.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Date: {expense.date}</p>
                        <p className="text-gray-500 text-sm">Description: {expense.description}</p>
                        <p className="text-gray-500 text-sm">Amount: {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}</p>
                        <p className="text-gray-500 text-sm">Currency: {expense.currency}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(expense)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredExpenses.length}
          />
        )}

        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingExpense ? "Edit Expense" : "Add New Expense"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="PKR">PKR (₨)</option>
                    <option value="SAR">SAR (ر.س)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    {editingExpense ? "Update" : "Add"} Expense
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
          onConfirm={() => deleteModal.expense && handleDelete(deleteModal.expense)}
          title="Delete Expense"
          message="Are you sure you want to delete this expense? This action cannot be undone."
        />
      </div>
    </DashboardLayout>
  )
}