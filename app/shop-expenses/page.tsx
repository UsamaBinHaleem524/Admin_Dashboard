"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, Calendar } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn, formatDisplayDate } from "@/lib/utils"
import { shopExpensesAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"

interface ShopExpense {
  id: string
  description: string
  incomingDescription: string
  outgoingDescription: string
  date: string
  previousAmount: number
  income: number
  outgoingAmount: number
  totalCash: number
  currency: "USD" | "PKR" | "SAR" | "CNY"
  createdAt?: string
  updatedAt?: string
}

export default function ShopExpensesPage() {
  const [shopExpenses, setShopExpenses] = useState<ShopExpense[]>([])
  const [filteredShopExpenses, setFilteredShopExpenses] = useState<ShopExpense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'PKR' | 'SAR' | 'CNY'>("USD")
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
    previousAmount: "",
    income: "",
    outgoingAmount: "",
    currency: "USD" as "USD" | "PKR" | "SAR" | "CNY",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadShopExpenses()
  }, [])

  useEffect(() => {
    filterShopExpenses()
  }, [shopExpenses, searchTerm, selectedDate, selectedMonth, selectedYear])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedDate, selectedMonth, selectedYear])

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
    let filtered = shopExpenses
    
    if (searchTerm) {
      filtered = filtered.filter(
        (expense) => {
          const description = (expense.description || expense.incomingDescription || expense.outgoingDescription || '').toLowerCase()
          return description.includes(searchTerm.toLowerCase()) ||
            expense.date.includes(searchTerm) ||
            expense.currency.toLowerCase().includes(searchTerm.toLowerCase())
        }
      )
    }
    
    if (selectedDate) {
      filtered = filtered.filter(expense => expense.date === selectedDate)
    }
    
    if (selectedMonth) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date)
        const expenseMonth = expenseDate.getMonth() + 1 // getMonth() returns 0-11, so add 1
        return expenseMonth.toString() === selectedMonth
      })
    }
    
    if (selectedYear) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date)
        const expenseYear = expenseDate.getFullYear().toString()
        return expenseYear === selectedYear
      })
    }
    
    setFilteredShopExpenses(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.currency) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const previousAmount = Number.parseFloat(formData.previousAmount) || 0
    const income = Number.parseFloat(formData.income) || 0
    const outgoingAmount = Number.parseFloat(formData.outgoingAmount) || 0

    const shopExpenseData: ShopExpense = {
      id: editingShopExpense ? editingShopExpense.id : Date.now().toString(),
      description: formData.description,
      incomingDescription: '', // Keep for backward compatibility
      outgoingDescription: formData.description, // Keep for backward compatibility
      date: formData.date,
      previousAmount,
      income,
      outgoingAmount,
      totalCash: (previousAmount + income) - outgoingAmount,
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
    const description = shopExpense.description || shopExpense.incomingDescription || shopExpense.outgoingDescription || ""
    setFormData({
      description: description,
      date: shopExpense.date,
      previousAmount: (shopExpense.previousAmount || 0).toString(),
      income: (shopExpense.income || 0).toString(),
      outgoingAmount: (shopExpense.outgoingAmount || 0).toString(),
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
      previousAmount: "",
      income: "",
      outgoingAmount: "",
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

  const getCurrencySymbol = (currency: "USD" | "PKR" | "SAR" | "CNY") => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      case "CNY": return "¥"
      default: return ""
    }
  }

  const convertToDisplayCurrency = (amount: number, fromCurrency: 'USD' | 'PKR' | 'SAR' | 'CNY') => {
    // Simple conversion rates (you might want to use real-time rates in production)
    const conversionRates = {
      USD: { USD: 1, PKR: 280, SAR: 3.75, CNY: 7.24 },
      PKR: { USD: 0.0036, PKR: 1, SAR: 0.013, CNY: 0.026 },
      SAR: { USD: 0.27, PKR: 75, SAR: 1, CNY: 1.93 },
      CNY: { USD: 0.138, PKR: 38.66, SAR: 0.518, CNY: 1 }
    }
    
    return amount * conversionRates[fromCurrency][displayCurrency]
  }

  // Calculate totals
  const getTotalIncome = () => {
    return filteredShopExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.income, expense.currency)
    }, 0)
  }

  const getTotalOutgoing = () => {
    return filteredShopExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.outgoingAmount, expense.currency)
    }, 0)
  }

  const getTotalCash = () => {
    return filteredShopExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.totalCash, expense.currency)
    }, 0)
  }

  const getCurrencyBreakdown = () => {
    const breakdown = {
      income: { USD: 0, PKR: 0, SAR: 0, CNY: 0 },
      outgoing: { USD: 0, PKR: 0, SAR: 0, CNY: 0 },
      totalCash: { USD: 0, PKR: 0, SAR: 0, CNY: 0 }
    }
    
    filteredShopExpenses.forEach(expense => {
      breakdown.income[expense.currency] += expense.income || 0
      breakdown.outgoing[expense.currency] += expense.outgoingAmount || 0
      breakdown.totalCash[expense.currency] += expense.totalCash || 0
    })
    
    return breakdown
  }

  const calculateTotalCash = () => {
    const previousAmount = Number.parseFloat(formData.previousAmount) || 0
    const income = Number.parseFloat(formData.income) || 0
    const outgoingAmount = Number.parseFloat(formData.outgoingAmount) || 0
    return (previousAmount + income) - outgoingAmount
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shop Expenses</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage shop expenses and cash flow</p>
          </div>

        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {getCurrencySymbol(displayCurrency)}{getTotalIncome().toFixed(2)}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Outgoing</p>
              <p className="text-2xl font-bold text-red-600">
                {getCurrencySymbol(displayCurrency)}{getTotalOutgoing().toFixed(2)}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Cash</p>
              <p className={cn(
                "text-2xl font-bold",
                getTotalCash() >= 0 ? "text-blue-600" : "text-red-600"
              )}>
                {getCurrencySymbol(displayCurrency)}{getTotalCash().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Currency Breakdown */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency Breakdown</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Breakdown */}
            <div>
              <h4 className="text-md font-medium text-green-600 mb-3">Income by Currency</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium text-blue-600">USD Income</p>
                    <p className="text-xl font-bold text-blue-700">
                      ${getCurrencyBreakdown().income.USD.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium text-green-600">PKR Income</p>
                    <p className="text-xl font-bold text-green-700">
                      ₨{getCurrencyBreakdown().income.PKR.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium text-purple-600">SAR Income</p>
                    <p className="text-xl font-bold text-purple-700">
                      ر.س{getCurrencyBreakdown().income.SAR.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Outgoing Breakdown */}
            <div>
              <h4 className="text-md font-medium text-red-600 mb-3">Outgoing by Currency</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium text-blue-600">USD Outgoing</p>
                    <p className="text-xl font-bold text-blue-700">
                      ${getCurrencyBreakdown().outgoing.USD.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium text-green-600">PKR Outgoing</p>
                    <p className="text-xl font-bold text-green-700">
                      ₨{getCurrencyBreakdown().outgoing.PKR.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium text-purple-600">SAR Outgoing</p>
                    <p className="text-xl font-bold text-purple-700">
                      ر.س{getCurrencyBreakdown().outgoing.SAR.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Cash Breakdown */}
          {/* <div className="mt-6">
            <h4 className="text-md font-medium text-blue-600 mb-3">Total Cash by Currency</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium text-blue-600">USD Cash</p>
                  <p className={cn(
                    "text-xl font-bold",
                    getCurrencyBreakdown().totalCash.USD >= 0 ? "text-blue-700" : "text-red-700"
                  )}>
                    ${getCurrencyBreakdown().totalCash.USD.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium text-green-600">PKR Cash</p>
                  <p className={cn(
                    "text-xl font-bold",
                    getCurrencyBreakdown().totalCash.PKR >= 0 ? "text-green-700" : "text-red-700"
                  )}>
                    ₨{getCurrencyBreakdown().totalCash.PKR.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium text-purple-600">SAR Cash</p>
                  <p className={cn(
                    "text-xl font-bold",
                    getCurrencyBreakdown().totalCash.SAR >= 0 ? "text-purple-700" : "text-red-700"
                  )}>
                    ر.س{getCurrencyBreakdown().totalCash.SAR.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div> */}
        </div>

        {/* Currency Selector */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Display Currency</h3>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as 'USD' | 'PKR' | 'SAR' | 'CNY')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="USD">USD - Dollar</option>
              <option value="PKR">PKR - Pakistani Rupee</option>
              <option value="SAR">SAR - Saudi Riyal</option>
              <option value="CNY">CNY - Chinese Yuan</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            All totals will be converted and displayed in the selected currency
          </p>
        </div>

        {/* INCOME & EXPENSE LEDGER BOOK Header */}
        <div className="bg-white rounded-lg shadow p-6 sm:p-8">
          <div className="border-2 border-black p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center uppercase tracking-wide">
              INCOME & EXPENSE LEDGER BOOK
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex flex-col space-y-4">
              {/* Date Filters Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-700">Date:</label>
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
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-700">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  {selectedMonth && (
                    <button
                      onClick={() => setSelectedMonth("")}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-700">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Years</option>
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                  {selectedYear && (
                    <button
                      onClick={() => setSelectedYear("")}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Search Row */}
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by incoming/outgoing description, date, or currency..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    No.
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Description
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Previous Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Income
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Outgoing Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Total Cash
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 sm:px-6 py-4 text-center text-gray-500 border border-gray-300">
                      Loading...
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 sm:px-6 py-4 text-center text-gray-500 border border-gray-300">
                      No shop expenses found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((expense, index) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 border border-gray-300">
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 border border-gray-300">
                        {formatDisplayDate(expense.date)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 border border-gray-300">
                        {expense.description || expense.incomingDescription || expense.outgoingDescription || "-"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                        {getCurrencySymbol(expense.currency)}{(expense.previousAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium border border-gray-300">
                        {getCurrencySymbol(expense.currency)}{(expense.income || 0).toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium border border-gray-300">
                        {getCurrencySymbol(expense.currency)}{(expense.outgoingAmount || 0).toFixed(2)}
                      </td>
                      <td className={cn(
                        "px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium border border-gray-300",
                        (expense.totalCash || 0) >= 0 ? "text-blue-600" : "text-red-600"
                      )}>
                        {getCurrencySymbol(expense.currency)}{(expense.totalCash || 0).toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium border border-gray-300">
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
                
                {/* Add new row */}
                <tr className="bg-blue-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 border border-gray-300">
                    {indexOfFirstItem + currentItems.length + 1}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap border border-gray-300">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 border border-gray-300">
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      rows={2}
                      placeholder="Enter description"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap border border-gray-300">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.previousAmount}
                      onChange={(e) => setFormData({ ...formData, previousAmount: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap border border-gray-300">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.income}
                      onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap border border-gray-300">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.outgoingAmount}
                      onChange={(e) => setFormData({ ...formData, outgoingAmount: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className={cn(
                    "px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium border border-gray-300",
                    calculateTotalCash() >= 0 ? "text-blue-600" : "text-red-600"
                  )}>
                    {getCurrencySymbol(formData.currency)}{calculateTotalCash().toFixed(2)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap border border-gray-300">
                    <div className="flex items-center space-x-2">
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" | "CNY" })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="USD">USD</option>
                        <option value="PKR">PKR</option>
                        <option value="SAR">SAR</option>
                        <option value="CNY">CNY</option>
                      </select>
                      <button
                        onClick={async () => {
                          if (!formData.date || !formData.currency) {
                            showToast("Please fill in date and currency", "error")
                            return
                          }
                          try {
                            const previousAmount = Number.parseFloat(formData.previousAmount) || 0
                            const income = Number.parseFloat(formData.income) || 0
                            const outgoingAmount = Number.parseFloat(formData.outgoingAmount) || 0

                            const shopExpenseData: ShopExpense = {
                              id: Date.now().toString(),
                              description: formData.description,
                              incomingDescription: '',
                              outgoingDescription: formData.description,
                              date: formData.date,
                              previousAmount,
                              income,
                              outgoingAmount,
                              totalCash: (previousAmount + income) - outgoingAmount,
                              currency: formData.currency,
                            }
                            
                            await shopExpensesAPI.create(shopExpenseData)
                            showToast("Shop expense added successfully!", "success")
                            
                            await loadShopExpenses()
                            resetForm()
                          } catch (error) {
                            showToast("Failed to save shop expense", "error")
                            console.error("Error saving shop expense:", error)
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
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

        {/* Edit Dialog - Only for editing existing records */}
        {isDialogOpen && editingShopExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 !mt-0">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold mb-4">Edit Shop Expense</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previous Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.previousAmount}
                    onChange={(e) => setFormData({ ...formData, previousAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Income</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.income}
                    onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outgoing Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.outgoingAmount}
                    onChange={(e) => setFormData({ ...formData, outgoingAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Cash (Calculated)</label>
                  <input
                    type="text"
                    value={`${getCurrencySymbol(formData.currency)}${calculateTotalCash().toFixed(2)}`}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" | "CNY" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">Dollar (USD)</option>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                    <option value="CNY">Chinese Yuan (CNY)</option>
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
                    Update
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
        />
      </div>
    </DashboardLayout>
  )
}