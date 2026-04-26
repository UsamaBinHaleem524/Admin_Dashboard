"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Edit, Trash2, Search, Check } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn, formatDisplayDate } from "@/lib/utils"
import { personalExpensesAPI, settingsAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"
import { DateInput } from "@/components/ui/date-input"

interface PersonalExpense {
  id: string
  description: string
  incomingDescription: string
  outgoingDescription: string
  date: string
  folio?: string
  previousAmount: number
  income: number
  outgoingAmount: number
  totalCash: number
  currency: "USD" | "PKR" | "SAR" | "CNY"
  createdAt?: string
  updatedAt?: string
}

export default function PersonalExpensesPage() {
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([])
  const [filteredPersonalExpenses, setFilteredPersonalExpenses] = useState<PersonalExpense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'PKR' | 'SAR' | 'CNY'>("USD")
  const [availableBalances, setAvailableBalances] = useState<{
    USD: string
    PKR: string
    SAR: string
    CNY: string
  }>({ USD: "", PKR: "", SAR: "", CNY: "" })
  const [availableBalanceEdit, setAvailableBalanceEdit] = useState<{
    USD: boolean
    PKR: boolean
    SAR: boolean
    CNY: boolean
  }>({ USD: false, PKR: false, SAR: false, CNY: false })
  const [availableBalanceDraft, setAvailableBalanceDraft] = useState<{
    USD: string
    PKR: string
    SAR: string
    CNY: string
  }>({ USD: "", PKR: "", SAR: "", CNY: "" })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPersonalExpense, setEditingPersonalExpense] = useState<PersonalExpense | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; expense: PersonalExpense | null }>({
    isOpen: false,
    expense: null,
  })
  const [formData, setFormData] = useState({
    description: "",
    folio: "",
    date: new Date().toISOString().split('T')[0],
    income: "",
    outgoingAmount: "",
    currency: "USD" as "USD" | "PKR" | "SAR" | "CNY",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadPersonalExpenses()
  }, [])

  // Load available balances when selected date changes
  useEffect(() => {
    loadAvailableBalances()
  }, [selectedDate])

  const loadAvailableBalances = async () => {
    if (!selectedDate) return
    
    const currencies: Array<'USD' | 'PKR' | 'SAR' | 'CNY'> = ['USD', 'PKR', 'SAR', 'CNY']
    const balances = { USD: "", PKR: "", SAR: "", CNY: "" }
    
    for (const currency of currencies) {
      try {
        const key = `personalAvailableBalance_${selectedDate}_${currency}`
        const result = await settingsAPI.get(key)
        if (result?.value) {
          balances[currency] = result.value
        }
      } catch {
        // Balance doesn't exist for this date/currency combination
      }
    }
    
    setAvailableBalances(balances)
  }

  useEffect(() => {
    filterPersonalExpenses()
  }, [personalExpenses, searchTerm, selectedDate, selectedMonth, selectedYear])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedDate, selectedMonth, selectedYear])

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

  const filterPersonalExpenses = () => {
    let filtered = personalExpenses
    
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
    
    setFilteredPersonalExpenses(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.currency) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const income = Number.parseFloat(formData.income) || 0
    const outgoingAmount = Number.parseFloat(formData.outgoingAmount) || 0

    if (income < 0 || outgoingAmount < 0) {
      showToast("Income and outgoing amount cannot be negative", "error")
      return
    }

    const personalExpenseData: PersonalExpense = {
      id: editingPersonalExpense ? editingPersonalExpense.id : Date.now().toString(),
      description: formData.description,
      folio: formData.folio,
      incomingDescription: '',
      outgoingDescription: formData.description,
      date: formData.date,
      previousAmount: 0,
      income,
      outgoingAmount,
      totalCash: income - outgoingAmount,
      currency: formData.currency,
    }

    try {
      if (editingPersonalExpense) {
        await personalExpensesAPI.update(personalExpenseData)
        showToast("Personal expense updated successfully!", "success")
      } else {
        await personalExpensesAPI.create(personalExpenseData)
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

  const handleEdit = (personalExpense: PersonalExpense) => {
    setEditingPersonalExpense(personalExpense)
    const description = personalExpense.description || personalExpense.incomingDescription || personalExpense.outgoingDescription || ""
    setFormData({
      description: description,
      folio: personalExpense.folio || "",
      date: personalExpense.date,
      income: (personalExpense.income || 0).toString(),
      outgoingAmount: (personalExpense.outgoingAmount || 0).toString(),
      currency: personalExpense.currency || "USD",
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
      folio: "",
      date: new Date().toISOString().split('T')[0],
      income: "",
      outgoingAmount: "",
      currency: "USD",
    })
    setEditingPersonalExpense(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPersonalExpenses.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPersonalExpenses.length / itemsPerPage)

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
    return filteredPersonalExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.income, expense.currency)
    }, 0)
  }

  const getTotalOutgoing = () => {
    return filteredPersonalExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.outgoingAmount, expense.currency)
    }, 0)
  }

  const getTotalCash = () => {
    return filteredPersonalExpenses.reduce((sum, expense) => {
      return sum + convertToDisplayCurrency(expense.totalCash, expense.currency)
    }, 0)
  }

  const getCurrencyBreakdown = () => {
    const breakdown = {
      income: { USD: 0, PKR: 0, SAR: 0, CNY: 0 },
      outgoing: { USD: 0, PKR: 0, SAR: 0, CNY: 0 },
      totalCash: { USD: 0, PKR: 0, SAR: 0, CNY: 0 }
    }
    
    filteredPersonalExpenses.forEach(expense => {
      breakdown.income[expense.currency] += expense.income || 0
      breakdown.outgoing[expense.currency] += expense.outgoingAmount || 0
      breakdown.totalCash[expense.currency] += expense.totalCash || 0
    })
    
    return breakdown
  }

  const handleAvailableBalanceEdit = (currency: 'USD' | 'PKR' | 'SAR' | 'CNY') => {
    setAvailableBalanceEdit({ ...availableBalanceEdit, [currency]: true })
    setAvailableBalanceDraft({ ...availableBalanceDraft, [currency]: availableBalances[currency] })
  }

  const handleAvailableBalanceSave = async (currency: 'USD' | 'PKR' | 'SAR' | 'CNY') => {
    const balance = Number.parseFloat(availableBalanceDraft[currency])
    
    if (isNaN(balance)) {
      showToast("Please enter a valid number", "error")
      return
    }

    if (balance < 0) {
      showToast("Balance cannot be negative", "error")
      return
    }

    try {
      const key = `personalAvailableBalance_${selectedDate}_${currency}`
      await settingsAPI.set(key, availableBalanceDraft[currency])
      setAvailableBalances({ ...availableBalances, [currency]: availableBalanceDraft[currency] })
      setAvailableBalanceEdit({ ...availableBalanceEdit, [currency]: false })
      showToast(`${currency} available balance updated successfully`, "success")
    } catch (error) {
      console.error(`Error updating ${currency} available balance:`, error)
      showToast(`Failed to update ${currency} available balance`, "error")
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Personal Expenses</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage personal expenses and cash flow</p>
            </div>
          </div>

          {/* Available Balances for Selected Date */}
          {selectedDate && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Available Balance for {formatDisplayDate(selectedDate)}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(['USD', 'PKR', 'SAR', 'CNY'] as const).map((currency) => {
                  const currencySymbols = { USD: "$", PKR: "₨", SAR: "ر.س", CNY: "¥" }
                  return (
                    <div key={currency} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-600">{currency}</label>
                        {!availableBalanceEdit[currency] && (
                          <button
                            onClick={() => {
                              setAvailableBalanceDraft({ ...availableBalanceDraft, [currency]: availableBalances[currency] })
                              setAvailableBalanceEdit({ ...availableBalanceEdit, [currency]: true })
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {availableBalanceEdit[currency] ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={availableBalanceDraft[currency]}
                            onChange={(e) => setAvailableBalanceDraft({ ...availableBalanceDraft, [currency]: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-2 py-1 text-sm border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              try {
                                const balance = Number.parseFloat(availableBalanceDraft[currency])
                                if (balance < 0) {
                                  showToast("Balance cannot be negative", "error")
                                  return
                                }
                                const key = `personalAvailableBalance_${selectedDate}_${currency}`
                                await settingsAPI.set(key, availableBalanceDraft[currency])
                                setAvailableBalances({ ...availableBalances, [currency]: availableBalanceDraft[currency] })
                                setAvailableBalanceEdit({ ...availableBalanceEdit, [currency]: false })
                                showToast(`${currency} balance saved!`, "success")
                              } catch {
                                showToast("Failed to save balance", "error")
                              }
                            }}
                            className="p-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex-shrink-0"
                            title="Save"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-gray-800">
                          {availableBalances[currency] ? `${currencySymbols[currency]}${Number(availableBalances[currency]).toFixed(2)}` : "—"}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Total Cash Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Cash</p>
              <p className="text-2xl font-bold">
                {getCurrencySymbol(displayCurrency)}{getTotalCash().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Currency Breakdown */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency Breakdown</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-green-600 mb-3">Income by Currency</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600">USD Income</p>
                  <p className="text-xl font-bold text-blue-700">${getCurrencyBreakdown().income.USD.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-600">PKR Income</p>
                  <p className="text-xl font-bold text-green-700">₨{getCurrencyBreakdown().income.PKR.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-600">SAR Income</p>
                  <p className="text-xl font-bold text-purple-700">ر.س{getCurrencyBreakdown().income.SAR.toFixed(2)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-600">CNY Income</p>
                  <p className="text-xl font-bold text-orange-700">¥{getCurrencyBreakdown().income.CNY.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-red-600 mb-3">Outgoing by Currency</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600">USD Outgoing</p>
                  <p className="text-xl font-bold text-blue-700">${getCurrencyBreakdown().outgoing.USD.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-600">PKR Outgoing</p>
                  <p className="text-xl font-bold text-green-700">₨{getCurrencyBreakdown().outgoing.PKR.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-600">SAR Outgoing</p>
                  <p className="text-xl font-bold text-purple-700">ر.س{getCurrencyBreakdown().outgoing.SAR.toFixed(2)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-600">CNY Outgoing</p>
                  <p className="text-xl font-bold text-orange-700">¥{getCurrencyBreakdown().outgoing.CNY.toFixed(2)}</p>
                </div>
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
                    <DateInput
                      value={selectedDate}
                      onChange={(value) => setSelectedDate(value)}
                      className="text-sm"
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
                      Folio
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Income
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Outgoing Amount
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-6 py-4 text-center text-gray-500 border border-gray-300">
                        Loading...
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-6 py-4 text-center text-gray-500 border border-gray-300">
                        No personal expenses found
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((expense, index) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                          {indexOfFirstItem + index + 1}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                          {formatDisplayDate(expense.date)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 border border-gray-300">
                          <div className="max-w-xs">
                            {expense.description || expense.incomingDescription || expense.outgoingDescription || '-'}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                          {expense.folio || '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm border border-gray-300">
                          <span className="font-medium text-green-600">
                            {getCurrencySymbol(expense.currency)}{expense.income.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm border border-gray-300">
                          <span className="font-medium text-red-600">
                            {getCurrencySymbol(expense.currency)}{expense.outgoingAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm border border-gray-300">
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
                  {/* Inline Add Row */}
                  <tr className="bg-blue-50 border-t-2 border-blue-300">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      New
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap border border-gray-300">
                      <DateInput
                        value={formData.date}
                        onChange={(value) => setFormData({ ...formData, date: value })}
                        className="text-sm"
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
                        type="text"
                        value={formData.folio}
                        onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Folio"
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
                              const income = Number.parseFloat(formData.income) || 0
                              const outgoingAmount = Number.parseFloat(formData.outgoingAmount) || 0

                              if (income < 0 || outgoingAmount < 0) {
                                showToast("Income and outgoing amount cannot be negative", "error")
                                return
                              }

                              const personalExpenseData: PersonalExpense = {
                                id: Date.now().toString(),
                                description: formData.description,
                                folio: formData.folio,
                                incomingDescription: '',
                                outgoingDescription: formData.description,
                                date: formData.date,
                                previousAmount: 0,
                                income,
                                outgoingAmount,
                                totalCash: income - outgoingAmount,
                                currency: formData.currency,
                              }
                              
                              await personalExpensesAPI.create(personalExpenseData)
                              showToast("Personal expense added successfully!", "success")
                              
                              await loadPersonalExpenses()
                              resetForm()
                            } catch (error) {
                              showToast("Failed to save personal expense", "error")
                              console.error("Error saving personal expense:", error)
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredPersonalExpenses.length}
          />
        )}

        {/* Edit Dialog - Only for editing existing records */}
        {isDialogOpen && editingPersonalExpense && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 !mt-0">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-lg font-semibold mb-4">Edit Personal Expense</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <DateInput
                      value={formData.date}
                      onChange={(value) => setFormData({ ...formData, date: value })}
                      required
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Folio</label>
                    <input
                      type="text"
                      value={formData.folio}
                      onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter folio"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" | "CNY" })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="USD">USD - Dollar</option>
                      <option value="PKR">PKR - Pakistani Rupee</option>
                      <option value="SAR">SAR - Saudi Riyal</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Update Expense
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteModal
            isOpen={deleteModal.isOpen}
            onClose={closeDeleteModal}
            onConfirm={() => {
              if (deleteModal.expense) {
                handleDelete(deleteModal.expense.id)
                closeDeleteModal()
              }
            }}
            title="Delete Personal Expense"
            message="Are you sure you want to delete this personal expense? This action cannot be undone."
          />
      </div>
    </DashboardLayout>
  )
}
