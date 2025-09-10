"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { purchasesAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"

interface Purchase {
  id: string
  supplier: string
  item: string
  description: string
  amount: number
  currency: "USD" | "PKR" | "SAR"
  date: string
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; purchase: Purchase | null }>({
    isOpen: false,
    purchase: null,
  })
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "PKR" | "SAR">("USD")
  const [formData, setFormData] = useState({
    supplier: "",
    item: "",
    description: "",
    amount: "",
    currency: "USD" as "USD" | "PKR" | "SAR",
    date: new Date().toISOString().split('T')[0],
  })
  const [products, setProducts] = useState<{id: string, name: string}[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    loadPurchases()
    loadProducts()
  }, [])

  useEffect(() => {
    filterPurchases()
  }, [purchases, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadPurchases = async () => {
    try {
      setLoading(true)
      const data = await purchasesAPI.getAll()
      setPurchases(data)
    } catch (error) {
      showToast("Failed to load purchases", "error")
      console.error("Error loading purchases:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      showToast("Failed to load products", "error")
      console.error("Error loading products:", error)
    }
  }

  const filterPurchases = () => {
    if (!searchTerm) {
      setFilteredPurchases(purchases)
    } else {
      const filtered = purchases.filter(
        (purchase) =>
          purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.date.includes(searchTerm)
      )
      setFilteredPurchases(filtered)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier || !formData.item || !formData.description || !formData.amount || !formData.date || !formData.currency) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const amount = Number.parseFloat(formData.amount) || 0

    const purchaseData: Purchase = {
      id: editingPurchase ? editingPurchase.id : Date.now().toString(),
      supplier: formData.supplier,
      item: formData.item,
      description: formData.description,
      amount: amount,
      currency: formData.currency,
      date: formData.date,
    }

    try {
      if (editingPurchase) {
        await purchasesAPI.update(purchaseData)
        showToast("Purchase updated successfully!", "success")
      } else {
        await purchasesAPI.create(purchaseData)
        showToast("Purchase added successfully!", "success")
      }
      
      await loadPurchases()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save purchase", "error")
      console.error("Error saving purchase:", error)
    }
  }

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setFormData({
      supplier: purchase.supplier,
      item: purchase.item,
      description: purchase.description,
      amount: (purchase.amount || 0).toString(),
      currency: purchase.currency || "USD",
      date: purchase.date,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await purchasesAPI.delete(id)
      await loadPurchases()
      showToast("Purchase deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete purchase", "error")
      console.error("Error deleting purchase:", error)
    }
  }

  const openDeleteModal = (purchase: Purchase) => {
    setDeleteModal({ isOpen: true, purchase })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, purchase: null })
  }

  const resetForm = () => {
    setFormData({
      supplier: "",
      item: "",
      description: "",
      amount: "",
      currency: "USD",
      date: new Date().toISOString().split('T')[0],
    })
    setEditingPurchase(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Currency conversion rates (you can update these with real-time rates)
  const conversionRates = {
    USD: 1,
    PKR: 280, // 1 USD = 280 PKR (approximate)
    SAR: 3.75, // 1 USD = 3.75 SAR (approximate)
  }

  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / conversionRates[fromCurrency as keyof typeof conversionRates]
    return usdAmount * conversionRates[toCurrency as keyof typeof conversionRates]
  }

  const getCurrencySymbol = (currency: "USD" | "PKR" | "SAR") => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      default: return ""
    }
  }

  const getTotalAmountInSelectedCurrency = () => {
    const totalUSD = purchases.reduce((sum, purchase) => {
      const usdAmount = convertCurrency(purchase.amount, purchase.currency, "USD")
      return sum + usdAmount
    }, 0)
    
    return convertCurrency(totalUSD, "USD", selectedCurrency)
  }

  const getCurrencyBreakdown = () => {
    const breakdown = {
      USD: 0,
      PKR: 0,
      SAR: 0
    }
    
    purchases.forEach(purchase => {
      breakdown[purchase.currency] += purchase.amount
    })
    
    return breakdown
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPurchases.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        {/* Header and Add Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchases</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your purchase records</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Purchase
          </button>
        </div>

        {/* Currency Selector and Total */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Purchase Amount</h3>
              <p className="text-2xl font-bold text-blue-600">
                {getCurrencySymbol(selectedCurrency)}{getTotalAmountInSelectedCurrency().toFixed(2)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="currency-selector" className="text-sm font-medium text-gray-700">
                Display Currency:
              </label>
              <select
                id="currency-selector"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as "USD" | "PKR" | "SAR")}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="USD">Dollar (USD)</option>
                <option value="PKR">Pakistani Rupee (PKR)</option>
                <option value="SAR">Saudi Riyal (SAR)</option>
              </select>
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

        {/* Search and Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Purchase Records</h3>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by supplier, item, description, or date..."
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
                    Item
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
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No purchase records found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {purchase.date}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {purchase.supplier}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {purchase.item}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm sm:text-base">
                        {purchase.description}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(purchase.currency)}{(purchase.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {purchase.currency}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(purchase)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(purchase)}
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
            totalItems={filteredPurchases.length}
          />
        )}

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex !mt-0 items-center justify-center z-50 px-4 sm:px-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingPurchase ? "Edit Purchase" : "Add New Purchase"}
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
                  <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
                    Item *
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
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
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
                    Currency *
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
                    {editingPurchase ? "Update" : "Add"} Purchase
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
          onConfirm={() => deleteModal.purchase && handleDelete(deleteModal.purchase.id)}
          title="Delete Purchase"
          message="Are you sure you want to delete this purchase? This action cannot be undone."
        />
      </div>
    </DashboardLayout>
  )
}