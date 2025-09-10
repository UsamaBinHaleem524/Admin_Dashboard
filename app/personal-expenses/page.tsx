"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, Calendar } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { personalExpensesAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"

interface PersonalExpense {
  id: string
  description: string
  amount: number
  date: string
  currency: 'USD' | 'PKR' | 'SAR'
}

export default function PersonalExpensesPage() {
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<PersonalExpense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'PKR' | 'SAR'>("USD")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; expense: PersonalExpense | null }>({
    isOpen: false,
    expense: null,
  })
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    currency: "USD" as 'USD' | 'PKR' | 'SAR',
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadPersonalExpenses()
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [personalExpenses, searchTerm, selectedDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedDate])

  const loadPersonalExpenses = async () => {
    try {
      setLoading(true)
      const data = await personalExpensesAPI.getAll()
      setPersonalExpenses(data)
    } catch (error) {
      showToast("Failed to load personal expenses", "error")
      console.error("Error loading personal expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterExpenses = () => {
    let filtered = personalExpenses

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.date.includes(searchTerm)
      )
    }

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter((expense) => expense.date === selectedDate)
    }

    setFilteredExpenses(filtered)
  }

  const getCurrencySymbol = (currency: 'USD' | 'PKR' | 'SAR') => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      default: return ""
    }
  }

  const calculateTotalAmount = (expenses: PersonalExpense[]) => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const getDailyTotal = () => {
    if (!selectedDate) return 0
    const dailyExpenses = personalExpenses.filter(expense => expense.date === selectedDate)
    return calculateTotalAmount(dailyExpenses)
  }

  const getTotalAmount = () => {
    return calculateTotalAmount(filteredExpenses)
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

  const getConvertedDailyTotal = () => {
    if (!selectedDate) return 0
    const dailyExpenses = personalExpenses.filter(expense => expense.date === selectedDate)
    return dailyExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.amount, expense.currency)
    }, 0)
  }

  const getConvertedTotalAmount = () => {
    return filteredExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.amount, expense.currency)
    }, 0)
  }

  const getCurrencyBreakdown = () => {
    const breakdown = {
      USD: 0,
      PKR: 0,
      SAR: 0
    }
    
    filteredExpenses.forEach(expense => {
      breakdown[expense.currency] += expense.amount
    })
    
    return breakdown
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description || !formData.amount || !formData.date || !formData.currency) {
      showToast("Please fill in all fields", "error")
      return
    }

    const expenseData: PersonalExpense = {
      id: editingExpense ? editingExpense.id : Date.now().toString(),
      description: formData.description,
      amount: Number.parseFloat(formData.amount),
      date: formData.date,
      currency: formData.currency,
    }

    try {
      if (editingExpense) {
        await personalExpensesAPI.update(expenseData)
        showToast("Personal expense updated successfully!", "success")
      } else {
        await personalExpensesAPI.create(expenseData)
        showToast("Personal expense added successfully!", "success")
      }
      
      await loadPersonalExpenses()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save personal expense", "error")
      console.error("Error saving personal expense:", error)
    }
  }

  const handleEdit = (expense: PersonalExpense) => {
    setEditingExpense(expense)
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date,
      currency: expense.currency,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await personalExpensesAPI.delete(id)
      await loadPersonalExpenses()
      showToast("Personal expense deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete personal expense", "error")
      console.error("Error deleting personal expense:", error)
    }
  }

  const openDeleteModal = (expense: PersonalExpense) => {
    setDeleteModal({ isOpen: true, expense })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, expense: null })
  }

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      currency: "USD",
    })
    setEditingExpense(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }


  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        {/* Header and Add Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Personal Expenses</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your personal expenses</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
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
                {getCurrencySymbol(displayCurrency)}{getConvertedTotalAmount().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Currency Breakdown */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-blue-600">USD Total</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${getCurrencyBreakdown().USD.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-green-600">PKR Total</p>
                <p className="text-2xl font-bold text-green-700">
                  ₨{getCurrencyBreakdown().PKR.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-purple-600">SAR Total</p>
                <p className="text-2xl font-bold text-purple-700">
                  ر.س{getCurrencyBreakdown().SAR.toFixed(2)}
                </p>
              </div>
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

        {/* Search and Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Personal Expense Records</h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2 flex-shrink-0">
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
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by description or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
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
                    Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No personal expenses found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm sm:text-base">
                        {expense.description}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {expense.currency}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {expense.date}
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
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredExpenses.length}
          />
        )}

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex !mt-0 items-center justify-center z-50 px-4 sm:px-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingExpense ? "Edit Personal Expense" : "Add New Personal Expense"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter expense description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'USD' | 'PKR' | 'SAR' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    >
                      <option value="USD">USD</option>
                      <option value="PKR">PKR</option>
                      <option value="SAR">SAR</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
          onConfirm={() => deleteModal.expense && handleDelete(deleteModal.expense.id)}
          title="Delete Personal Expense"
          message="Are you sure you want to delete this personal expense? This action cannot be undone."
          itemName={deleteModal.expense?.description}
        />
      </div>
    </DashboardLayout>
  )
} 