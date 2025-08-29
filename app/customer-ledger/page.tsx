"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import { customerTransactionsAPI, productsAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"

interface Product {
  id: string
  name: string
  date: string
}

interface CustomerTransaction {
  id: string
  customer: string
  unit: "yard" | "meter"
  item: string
  description: string
  date: string
  totalAmount: number
  givenAmount: number
  remainingAmount: number
  currency: "USD" | "PKR" | "SAR"
}

export default function CustomerLedgerPage() {
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<CustomerTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<CustomerTransaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; transaction: CustomerTransaction | null }>({
    isOpen: false,
    transaction: null,
  })
  const [formData, setFormData] = useState({
    customer: "",
    unit: "yard" as "yard" | "meter",
    item: "",
    description: "",
    totalAmount: "",
    givenAmount: "",
    remainingAmount: "",
    currency: "USD" as "USD" | "PKR" | "SAR",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadTransactions()
    loadProducts()
  }, [])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await customerTransactionsAPI.getAll()
      setTransactions(data)
    } catch (error) {
      showToast("Failed to load transactions", "error")
      console.error("Error loading transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll()
      setProducts(data)
    } catch (error) {
      showToast("Failed to load products", "error")
      console.error("Error loading products:", error)
    }
  }

  const saveTransactions = async (newTransactions: CustomerTransaction[]) => {
    setTransactions(newTransactions)
  }

  const filterTransactions = () => {
    if (!searchTerm) {
      setFilteredTransactions(transactions)
    } else {
      const filtered = transactions.filter(
        (transaction) =>
          transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (transaction.item && transaction.item.toLowerCase().includes(searchTerm.toLowerCase())) ||
          transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.date.includes(searchTerm) ||
          transaction.currency.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTransactions(filtered)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer || !formData.description || !formData.totalAmount || !formData.givenAmount || !formData.currency) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const totalAmount = Number.parseFloat(formData.totalAmount)
    const givenAmount = Number.parseFloat(formData.givenAmount)
    const remainingAmount = totalAmount - givenAmount

    const transactionData: CustomerTransaction = {
      id: editingTransaction ? editingTransaction.id : Date.now().toString(),
      customer: formData.customer,
      unit: formData.unit,
      item: formData.item,
      description: formData.description,
      date: new Date().toISOString().split('T')[0],
      totalAmount,
      givenAmount,
      remainingAmount,
      currency: formData.currency,
    }

    try {
      if (editingTransaction) {
        await customerTransactionsAPI.update(transactionData)
        showToast("Transaction updated successfully!", "success")
      } else {
        await customerTransactionsAPI.create(transactionData)
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

  const handleEdit = (transaction: CustomerTransaction) => {
    setEditingTransaction(transaction)
    setFormData({
      customer: transaction.customer,
      unit: transaction.unit,
      item: transaction.item || "",
      description: transaction.description,
      totalAmount: transaction.totalAmount.toString(),
      givenAmount: transaction.givenAmount.toString(),
      remainingAmount: transaction.remainingAmount.toString(),
      currency: transaction.currency,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await customerTransactionsAPI.delete(id)
      await loadTransactions()
      showToast("Transaction deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete transaction", "error")
      console.error("Error deleting transaction:", error)
    }
  }

  const openDeleteModal = (transaction: CustomerTransaction) => {
    setDeleteModal({ isOpen: true, transaction })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, transaction: null })
  }

  const resetForm = () => {
    setFormData({
      customer: "",
      unit: "yard",
      item: "",
      description: "",
      totalAmount: "",
      givenAmount: "",
      remainingAmount: "",
      currency: "USD",
    })
    setEditingTransaction(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const calculateRemainingAmount = () => {
    const total = Number.parseFloat(formData.totalAmount) || 0
    const given = Number.parseFloat(formData.givenAmount) || 0
    return (total - given).toFixed(2)
  }

  const getCurrencySymbol = (currency: "USD" | "PKR" | "SAR") => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      default: return ""
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customer Ledger</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage customer transactions</p>
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
                placeholder="Search by customer, item, description, date, or currency..."
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
                    Customer
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Given Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining Amount
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
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {transaction.customer}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {transaction.unit}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {transaction.item || "-"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm sm:text-base">
                        {transaction.description}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {transaction.date}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(transaction.currency)}{transaction.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(transaction.currency)}{transaction.givenAmount.toFixed(2)}
                      </td>
                      <td
                        className={cn(
                          "px-4 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base",
                          transaction.remainingAmount < 0 ? "text-red-800" : "text-green-800"
                        )}
                      >
                        {getCurrencySymbol(transaction.currency)}{transaction.remainingAmount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {transaction.currency}
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

        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center !mt-0 z-50 px-4 sm:px-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <input
                    id="customer"
                    type="text"
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as "yard" | "meter" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  >
                    <option value="yard">Yard</option>
                    <option value="meter">Meter</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    id="item"
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  >
                    <option value="">Select an item</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.name}>
                        {product.name}
                      </option>
                    ))}
                  </select>
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
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  >
                    <option value="USD">Dollar (USD)</option>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    placeholder="Enter total amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="givenAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Given Amount
                  </label>
                  <input
                    id="givenAmount"
                    type="number"
                    step="0.01"
                    value={formData.givenAmount}
                    onChange={(e) => setFormData({ ...formData, givenAmount: e.target.value })}
                    placeholder="Enter given amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="remainingAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Remaining Amount
                  </label>
                  <input
                    id="remainingAmount"
                    type="text"
                    value={`${getCurrencySymbol(formData.currency)}${calculateRemainingAmount()}`}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm sm:text-base"
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
          itemName={`${deleteModal.transaction?.customer} - ${deleteModal.transaction?.description}`}
        />
      </div>
    </DashboardLayout>
  )
}