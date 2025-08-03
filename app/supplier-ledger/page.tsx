"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"

interface SupplierTransaction {
  id: string
  supplier: string
  type: "payment" | "purchase"
  amount: number
  description: string
  date: string
}

interface SupplierBalance {
  supplier: string
  totalPurchases: number
  totalPayments: number
  balance: number
}

export default function SupplierLedgerPage() {
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<SupplierTransaction[]>([])
  const [supplierBalances, setSupplierBalances] = useState<SupplierBalance[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("transactions")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<SupplierTransaction | null>(null)
  const [formData, setFormData] = useState({
    supplier: "",
    type: "payment" as "payment" | "purchase",
    amount: "",
    description: "",
    date: "",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    filterTransactions()
    calculateBalances()
  }, [transactions, searchTerm])

  const loadTransactions = () => {
    const savedTransactions = localStorage.getItem("supplierTransactions")
    if (savedTransactions) {
      const parsedTransactions = JSON.parse(savedTransactions)
      setTransactions(parsedTransactions)
    }
  }

  const saveTransactions = (newTransactions: SupplierTransaction[]) => {
    localStorage.setItem("supplierTransactions", JSON.stringify(newTransactions))
    setTransactions(newTransactions)
  }

  const filterTransactions = () => {
    if (!searchTerm) {
      setFilteredTransactions(transactions)
    } else {
      const filtered = transactions.filter(
        (transaction) =>
          transaction.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.date.includes(searchTerm),
      )
      setFilteredTransactions(filtered)
    }
  }

  const calculateBalances = () => {
    const balanceMap = new Map<string, SupplierBalance>()

    transactions.forEach((transaction) => {
      if (!balanceMap.has(transaction.supplier)) {
        balanceMap.set(transaction.supplier, {
          supplier: transaction.supplier,
          totalPurchases: 0,
          totalPayments: 0,
          balance: 0,
        })
      }

      const balance = balanceMap.get(transaction.supplier)!
      if (transaction.type === "purchase") {
        balance.totalPurchases += transaction.amount
      } else {
        balance.totalPayments += transaction.amount
      }
      balance.balance = balance.totalPurchases - balance.totalPayments
    })

    setSupplierBalances(Array.from(balanceMap.values()))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier || !formData.amount || !formData.description || !formData.date) {
      showToast("Please fill in all fields", "error")
      return
    }

    const transactionData: SupplierTransaction = {
      id: editingTransaction ? editingTransaction.id : Date.now().toString(),
      supplier: formData.supplier,
      type: formData.type,
      amount: Number.parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
    }

    let newTransactions: SupplierTransaction[]
    if (editingTransaction) {
      newTransactions = transactions.map((transaction) =>
        transaction.id === editingTransaction.id ? transactionData : transaction,
      )
      showToast("Transaction updated successfully!", "success")
    } else {
      newTransactions = [...transactions, transactionData]
      showToast("Transaction added successfully!", "success")
    }

    saveTransactions(newTransactions)
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (transaction: SupplierTransaction) => {
    setEditingTransaction(transaction)
    setFormData({
      supplier: transaction.supplier,
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.date,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      const newTransactions = transactions.filter((transaction) => transaction.id !== id)
      saveTransactions(newTransactions)
      showToast("Transaction deleted successfully!", "success")
    }
  }

  const resetForm = () => {
    setFormData({ supplier: "", type: "payment", amount: "", description: "", date: "" })
    setEditingTransaction(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Supplier Ledger</h1>
            <p className="text-gray-600">Manage supplier transactions and balances</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("transactions")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "transactions"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Transaction History
              </button>
              <button
                onClick={() => setActiveTab("balances")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "balances"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Supplier Balance
              </button>
            </nav>
          </div>

          {activeTab === "transactions" && (
            <div>
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by supplier, description, or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="min-w-[32%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {transaction.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.type === "purchase"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            ${transaction.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">{transaction.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">{transaction.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(transaction)}
                                className="p-1 text-blue-600 hover:text-blue-800"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(transaction.id)}
                                className="p-1 text-red-600 hover:text-red-800"
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
          )}

          {activeTab === "balances" && (
            <div>
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Supplier Balances</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Purchases
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Payments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supplierBalances.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          No supplier balances found
                        </td>
                      </tr>
                    ) : (
                      supplierBalances.map((balance) => (
                        <tr key={balance.supplier} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{balance.supplier}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">
                            ${balance.totalPurchases.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-medium">
                            ${balance.totalPayments.toFixed(2)}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap font-medium ${
                              balance.balance >= 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            ${balance.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    id="supplier"
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Enter supplier name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "payment" | "purchase" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="payment">Payment</option>
                    <option value="purchase">Purchase</option>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    {editingTransaction ? "Update" : "Add"} Transaction
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
