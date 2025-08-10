"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, Calendar, Check } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"

interface ExpenseItem {
  name: string
  description: string
  amount: number
}

interface DailyExpense {
  date: string
  totalAmount: number
  expenses: ExpenseItem[]
}

export default function ExpenseTrackerPage() {
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<{ item: ExpenseItem, index: number }[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentTotal, setCurrentTotal] = useState("0.00")
  const [isTotalEditable, setIsTotalEditable] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadExpenses()
  }, [])

  useEffect(() => {
    updateCurrentTotalAndFilter()
  }, [dailyExpenses, selectedDate, searchTerm])

  const loadExpenses = () => {
    const savedExpenses = localStorage.getItem("dailyExpenses")
    if (savedExpenses) {
      const parsedExpenses = JSON.parse(savedExpenses)
      const sortedExpenses = parsedExpenses.sort((a: DailyExpense, b: DailyExpense) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setDailyExpenses(sortedExpenses)
    }
  }

  const saveExpenses = (newExpenses: DailyExpense[]) => {
    const sortedExpenses = newExpenses.sort((a: DailyExpense, b: DailyExpense) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    localStorage.setItem("dailyExpenses", JSON.stringify(sortedExpenses))
    setDailyExpenses(sortedExpenses)
  }

  const updateCurrentTotalAndFilter = () => {
    const entry = dailyExpenses.find(d => d.date === selectedDate)
    setCurrentTotal(entry ? entry.totalAmount.toFixed(2) : "0.00")

    const expenses = entry ? entry.expenses : []
    const allItems = expenses.map((item, index) => ({ item, index }))
    let filtered = allItems
    if (searchTerm) {
      filtered = allItems.filter(({ item }) => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    setFilteredExpenses(filtered)
  }

  const handleItemChange = (field: "name" | "description" | "amount", value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const calculateSpentAmount = (expenses: ExpenseItem[]) => {
    return expenses
      .reduce((sum, item) => sum + item.amount, 0)
      .toFixed(2)
  }

  const getTotalsForSelectedDate = () => {
    const entry = dailyExpenses.find(d => d.date === selectedDate)
    const expenses = entry ? entry.expenses : []
    const spent = calculateSpentAmount(expenses)
    const totalNum = parseFloat(currentTotal)
    const remaining = isNaN(totalNum) ? "0.00" : (totalNum - parseFloat(spent)).toFixed(2)
    return {
      total: currentTotal,
      spent,
      remaining,
    }
  }

  const handleSaveTotal = () => {
    const num = parseFloat(currentTotal)
    if (isNaN(num) || num < 0) {
      showToast("Invalid total amount. Please enter a non-negative number.", "error")
      const entry = dailyExpenses.find(d => d.date === selectedDate)
      setCurrentTotal(entry ? entry.totalAmount.toFixed(2) : "0.00")
      return
    }

    let newExpenses = [...dailyExpenses]
    const entryIndex = newExpenses.findIndex(d => d.date === selectedDate)
    if (entryIndex === -1) {
      newExpenses.push({ date: selectedDate, totalAmount: num, expenses: [] })
    } else {
      newExpenses[entryIndex].totalAmount = num
    }
    saveExpenses(newExpenses)
    setIsTotalEditable(false)
    showToast("Total amount updated", "success")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.description || !formData.amount || isNaN(parseFloat(formData.amount))) {
      showToast("Please fill in all fields with valid data", "error")
      return
    }

    const newItemAmount = parseFloat(formData.amount)
    if (newItemAmount < 0) {
      showToast("Expense amount cannot be negative", "error")
      return
    }

    const entry = dailyExpenses.find(d => d.date === selectedDate)
    const currentExpenses = entry ? entry.expenses : []
    const currentSpent = parseFloat(calculateSpentAmount(currentExpenses))
    const totalNum = parseFloat(currentTotal)
    let newSpent = currentSpent

    if (editingItemIndex !== null && entry) {
      newSpent = currentSpent - entry.expenses[editingItemIndex].amount + newItemAmount
    } else {
      newSpent = currentSpent + newItemAmount
    }

    if (!isNaN(totalNum) && newSpent > totalNum) {
      showToast("You don't have enough balance for this expense", "error")
      return
    }

    const newItem: ExpenseItem = {
      name: formData.name,
      description: formData.description,
      amount: newItemAmount,
    }

    let newDailyExpenses = [...dailyExpenses]
    let entryIndex = newDailyExpenses.findIndex(d => d.date === selectedDate)

    if (entryIndex === -1) {
      newDailyExpenses.push({ date: selectedDate, totalAmount: parseFloat(currentTotal) || 0, expenses: [newItem] })
    } else {
      if (editingItemIndex !== null) {
        newDailyExpenses[entryIndex].expenses[editingItemIndex] = newItem
      } else {
        newDailyExpenses[entryIndex].expenses.push(newItem)
      }
    }

    saveExpenses(newDailyExpenses)
    showToast(editingItemIndex !== null ? "Expense updated successfully!" : "Expense added successfully!", "success")
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (index: number) => {
    const entry = dailyExpenses.find(d => d.date === selectedDate)
    if (!entry) return
    const item = entry.expenses[index]
    setFormData({
      name: item.name,
      description: item.description,
      amount: item.amount.toString(),
    })
    setEditingItemIndex(index)
    setIsDialogOpen(true)
  }

  const handleDelete = (index: number) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      let newDailyExpenses = [...dailyExpenses]
      const entryIndex = newDailyExpenses.findIndex(d => d.date === selectedDate)
      if (entryIndex !== -1) {
        newDailyExpenses[entryIndex].expenses.splice(index, 1)
        saveExpenses(newDailyExpenses)
        showToast("Expense deleted successfully!", "success")
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      amount: "",
    })
    setEditingItemIndex(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const toggleTotalEdit = () => {
    setIsTotalEditable(true)
  }

  const totals = getTotalsForSelectedDate()

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Expense Tracker</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage daily expenses</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="sm:max-w-[80%] flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:text-base">
              <div className="bg-blue-100 p-4 rounded-lg shadow-sm flex items-center">
                <span className="font-medium text-blue-800 mr-2">Total Amount:</span>
                <div className="flex items-center">
                  {isTotalEditable ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        value={totals.total}
                        onChange={(e) => setCurrentTotal(e.target.value)}
                        className="text-blue-900 font-semibold bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-500 w-20"
                      />
                      <button
                        onClick={handleSaveTotal}
                        className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-blue-900 font-semibold">{totals.total}</span>
                      <button
                        onClick={toggleTotalEdit}
                        className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg shadow-sm">
                <span className="font-medium text-yellow-800">Spent Amount:</span>
                <span className="ml-2 text-yellow-900 font-semibold">{totals.spent}</span>
              </div>
              <div className={cn(
                "p-4 rounded-lg shadow-sm",
                parseFloat(totals.remaining) < 0 ? "bg-red-100" : "bg-green-100"
              )}>
                <span className={cn(
                  "font-medium",
                  parseFloat(totals.remaining) < 0 ? "text-red-800" : "text-green-800"
                )}>
                  Remaining Amount:
                </span>
                <span className={cn(
                  "ml-2 font-semibold",
                  parseFloat(totals.remaining) < 0 ? "text-red-900" : "text-green-900"
                )}>
                  {totals.remaining}
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] hidden md:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No expenses found for selected date
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(({ item, index }) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {item.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(index)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
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
              {filteredExpenses.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No expenses found for selected date
                </div>
              ) : (
                filteredExpenses.map(({ item, index }) => (
                  <div key={index} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                        <p className="text-gray-500 text-sm">Description: {item.description}</p>
                        <p className="text-gray-500 text-sm">Amount: {item.amount.toFixed(2)}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(index)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
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

        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingItemIndex !== null ? "Edit Expense" : "Add New Expense"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleItemChange("name", e.target.value)}
                    placeholder="Enter item name"
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
                    onChange={(e) => handleItemChange("description", e.target.value)}
                    placeholder="Enter description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
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
                    onChange={(e) => handleItemChange("amount", e.target.value)}
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
                    {editingItemIndex !== null ? "Update" : "Add"} Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}