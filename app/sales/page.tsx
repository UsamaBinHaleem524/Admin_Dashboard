"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { salesAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"
import { formatDisplayDate } from "@/lib/utils"

interface Sale {
  id: string
  customer: string
  item: string
  description: string
  amount: number
  currency: "USD" | "PKR" | "SAR" | "CNY"
  date: string
  createdAt?: string
  updatedAt?: string
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; sale: Sale | null }>({
    isOpen: false,
    sale: null,
  })
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "PKR" | "SAR" | "CNY">("USD")
  const [formData, setFormData] = useState({
    customer: "",
    item: "",
    description: "",
    amount: "",
    currency: "USD" as "USD" | "PKR" | "SAR" | "CNY",
    date: new Date().toISOString().split('T')[0],
  })
  const [products, setProducts] = useState<{id: string, name: string}[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    loadSales()
    loadProducts()
  }, [])

  useEffect(() => {
    filterSales()
  }, [sales, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadSales = async () => {
    try {
      setLoading(true)
      const data = await salesAPI.getAll()
      setSales(data)
    } catch (error) {
      showToast("Failed to load sales", "error")
      console.error("Error loading sales:", error)
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

  const filterSales = () => {
    if (!searchTerm) {
      setFilteredSales(sales)
    } else {
      const filtered = sales.filter(
        (sale) =>
          sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.date.includes(searchTerm)
      )
      setFilteredSales(filtered)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer || !formData.item || !formData.description || !formData.amount || !formData.date || !formData.currency) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const amount = Number.parseFloat(formData.amount) || 0

    const saleData: Sale = {
      id: editingSale ? editingSale.id : Date.now().toString(),
      customer: formData.customer,
      item: formData.item,
      description: formData.description,
      amount: amount,
      currency: formData.currency,
      date: formData.date,
    }

    try {
      if (editingSale) {
        await salesAPI.update(saleData)
        showToast("Sale updated successfully!", "success")
      } else {
        await salesAPI.create(saleData)
        showToast("Sale added successfully!", "success")
      }
      
      await loadSales()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save sale", "error")
      console.error("Error saving sale:", error)
    }
  }

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    setFormData({
      customer: sale.customer,
      item: sale.item,
      description: sale.description,
      amount: (sale.amount || 0).toString(),
      currency: sale.currency || "USD",
      date: sale.date,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await salesAPI.delete(id)
      await loadSales()
      showToast("Sale deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete sale", "error")
      console.error("Error deleting sale:", error)
    }
  }

  const openDeleteModal = (sale: Sale) => {
    setDeleteModal({ isOpen: true, sale })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, sale: null })
  }

  const resetForm = () => {
    setFormData({
      customer: "",
      item: "",
      description: "",
      amount: "",
      currency: "USD",
      date: new Date().toISOString().split('T')[0],
    })
    setEditingSale(null)
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
    CNY: 7.24, // 1 USD = 7.24 CNY (approximate)
  }

  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / conversionRates[fromCurrency as keyof typeof conversionRates]
    return usdAmount * conversionRates[toCurrency as keyof typeof conversionRates]
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

  const getTotalAmountInSelectedCurrency = () => {
    const totalUSD = sales.reduce((sum, sale) => {
      const usdAmount = convertCurrency(sale.amount, sale.currency, "USD")
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
    
    sales.forEach(sale => {
      breakdown[sale.currency] += sale.amount
    })
    
    return breakdown
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        {/* Header and Add Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your sales records</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Sale
          </button>
        </div>

        {/* Currency Selector and Total */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Sales Amount</h3>
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
                onChange={(e) => setSelectedCurrency(e.target.value as "USD" | "PKR" | "SAR" | "CNY")}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="USD">Dollar (USD)</option>
                <option value="PKR">Pakistani Rupee (PKR)</option>
                <option value="SAR">Saudi Riyal (SAR)</option>
                <option value="CNY">Chinese Yuan (CNY)</option>
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
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Sales Records</h3>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, item, description, or date..."
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
                    Customer
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
                      No sales records found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {formatDisplayDate(sale.date)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {sale.customer}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {sale.item}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm sm:text-base">
                        {sale.description}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(sale.currency)}{(sale.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {sale.currency}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(sale)}
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
            totalItems={filteredSales.length}
          />
        )}

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex !mt-0 items-center justify-center z-50 px-4 sm:px-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingSale ? "Edit Sale" : "Add New Sale"}
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
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
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
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" | "CNY" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  >
                    <option value="USD">Dollar (USD)</option>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                    <option value="CNY">Chinese Yuan (CNY)</option>
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
                    {editingSale ? "Update" : "Add"} Sale
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
          onConfirm={() => deleteModal.sale && handleDelete(deleteModal.sale.id)}
          title="Delete Sale"
          message="Are you sure you want to delete this sale? This action cannot be undone."
        />
      </div>
    </DashboardLayout>
  )
}