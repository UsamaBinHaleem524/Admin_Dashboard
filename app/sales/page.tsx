"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"


interface Sale {
  id: string
  customer: string
  description: string
  amount: number
  date: string
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [formData, setFormData] = useState({
    customer: "",
    description: "",
    amount: "",
    date: "",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadSales()
  }, [])

  useEffect(() => {
    filterSales()
  }, [sales, searchTerm])

  const loadSales = () => {
    const savedSales = localStorage.getItem("sales")
    if (savedSales) {
      const parsedSales = JSON.parse(savedSales)
      setSales(parsedSales)
    }
  }

  const saveSales = (newSales: Sale[]) => {
    localStorage.setItem("sales", JSON.stringify(newSales))
    setSales(newSales)
  }

  const filterSales = () => {
    if (!searchTerm) {
      setFilteredSales(sales)
    } else {
      const filtered = sales.filter(
        (sale) =>
          sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.date.includes(searchTerm)
      )
      setFilteredSales(filtered)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer || !formData.description || !formData.amount || !formData.date) {
      showToast("Please fill in all fields", "error")
      return
    }

    const saleData: Sale = {
      id: editingSale ? editingSale.id : Date.now().toString(),
      customer: formData.customer,
      description: formData.description,
      amount: Number.parseFloat(formData.amount),
      date: formData.date,
    }

    let newSales: Sale[]
    if (editingSale) {
      newSales = sales.map((sale) => (sale.id === editingSale.id ? saleData : sale))
      showToast("Sale updated successfully!", "success")
    } else {
      newSales = [...sales, saleData]
      showToast("Sale added successfully!", "success")
    }

    saveSales(newSales)
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    setFormData({
      customer: sale.customer,
      description: sale.description,
      amount: sale.amount.toString(),
      date: sale.date,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this sale?")) {
      const newSales = sales.filter((sale) => sale.id !== id)
      saveSales(newSales)
      showToast("Sale deleted successfully!", "success")
    }
  }

  const resetForm = () => {
    setFormData({ customer: "", description: "", amount: "", date: "" })
    setEditingSale(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
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

        {/* Search and Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Sales Records</h3>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, description, or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:max-w-[32%]  flex-1  px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
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
                    Description
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
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
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No sales records found
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {sale.customer}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm sm:text-base">{sale.description}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        ${sale.amount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {sale.date}
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
                            onClick={() => handleDelete(sale.id)}
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

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 sm:px-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingSale ? "Edit Sale" : "Add New Sale"}
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
                    {editingSale ? "Update" : "Add"} Sale
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