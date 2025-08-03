"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { useToast } from "@/components/toast-provider"

interface Purchase {
  id: string
  supplier: string
  description: string
  amount: number
  date: string
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [formData, setFormData] = useState({
    supplier: "",
    description: "",
    amount: "",
    date: "",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadPurchases()
  }, [])

  useEffect(() => {
    filterPurchases()
  }, [purchases, searchTerm])

  const loadPurchases = () => {
    const savedPurchases = localStorage.getItem("purchases")
    if (savedPurchases) {
      const parsedPurchases = JSON.parse(savedPurchases)
      setPurchases(parsedPurchases)
    }
  }

  const savePurchases = (newPurchases: Purchase[]) => {
    localStorage.setItem("purchases", JSON.stringify(newPurchases))
    setPurchases(newPurchases)
  }

  const filterPurchases = () => {
    if (!searchTerm) {
      setFilteredPurchases(purchases)
    } else {
      const filtered = purchases.filter(
        (purchase) =>
          purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.date.includes(searchTerm),
      )
      setFilteredPurchases(filtered)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier || !formData.description || !formData.amount || !formData.date) {
      showToast("Please fill in all fields", "error")
      return
    }

    const purchaseData: Purchase = {
      id: editingPurchase ? editingPurchase.id : Date.now().toString(),
      supplier: formData.supplier,
      description: formData.description,
      amount: Number.parseFloat(formData.amount),
      date: formData.date,
    }

    let newPurchases: Purchase[]
    if (editingPurchase) {
      newPurchases = purchases.map((purchase) => (purchase.id === editingPurchase.id ? purchaseData : purchase))
      showToast("Purchase updated successfully!", "success")
    } else {
      newPurchases = [...purchases, purchaseData]
      showToast("Purchase added successfully!", "success")
    }

    savePurchases(newPurchases)
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setFormData({
      supplier: purchase.supplier,
      description: purchase.description,
      amount: purchase.amount.toString(),
      date: purchase.date,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this purchase?")) {
      const newPurchases = purchases.filter((purchase) => purchase.id !== id)
      savePurchases(newPurchases)
      showToast("Purchase deleted successfully!", "success")
    }
  }

  const resetForm = () => {
    setFormData({ supplier: "", description: "", amount: "", date: "" })
    setEditingPurchase(null)
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
            <h1 className="text-3xl font-bold text-gray-900">Purchases</h1>
            <p className="text-gray-600">Manage your purchase records</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Purchase
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Records</h3>
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
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
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
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No purchase records found
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{purchase.supplier}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{purchase.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">${purchase.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{purchase.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(purchase)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(purchase.id)}
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

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">{editingPurchase ? "Edit Purchase" : "Add New Purchase"}</h3>
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
                    {editingPurchase ? "Update" : "Add"} Purchase
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
