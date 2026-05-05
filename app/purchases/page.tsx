"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, BookOpen, Lock } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { purchasesAPI, purchaseKhatasAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"
import { DateInput } from "@/components/ui/date-input"
import { formatDisplayDate } from "@/lib/utils"

interface Purchase {
  id: string
  supplier: string
  item: string
  description: string
  amount: number
  currency: "USD" | "PKR" | "SAR" | "CNY"
  date: string
  khataId?: string | null
  createdAt?: string
  updatedAt?: string
}

interface Khata {
  id: string
  name: string
  startDate: string
  endDate: string
  status: "active" | "closed"
  createdAt?: string
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [khatas, setKhatas] = useState<Khata[]>([])
  const [selectedKhataId, setSelectedKhataId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isKhataDialogOpen, setIsKhataDialogOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; purchase: Purchase | null }>({
    isOpen: false,
    purchase: null,
  })
  const [deleteKhataModal, setDeleteKhataModal] = useState<{ isOpen: boolean; khata: Khata | null }>({
    isOpen: false,
    khata: null,
  })
  const [formData, setFormData] = useState({
    supplier: "",
    item: "",
    items: [] as string[],
    description: "",
    amount: "",
    currency: "USD" as "USD" | "PKR" | "SAR" | "CNY",
    date: new Date().toISOString().split('T')[0],
  })
  const [khataForm, setKhataForm] = useState({
    name: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
  })
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedKhataId, selectedYear])

  const loadData = async () => {
    try {
      setLoading(true)
      const [purchasesData, khatasData] = await Promise.all([
        purchasesAPI.getAll(),
        purchaseKhatasAPI.getAll(),
      ])
      setPurchases(purchasesData)
      setKhatas(khatasData)

      // Auto-select the active khata
      const active = khatasData.find((k: Khata) => k.status === "active")
      if (active) setSelectedKhataId(active.id)
      else if (khatasData.length > 0) setSelectedKhataId(khatasData[0].id)
    } catch (error) {
      showToast("Failed to load data", "error")
      console.error("Error loading data:", error)
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
      console.error("Error loading products:", error)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const activeKhata = khatas.find((k) => k.status === "active") || null
  const selectedKhata = khatas.find((k) => k.id === selectedKhataId) || null
  const isSelectedKhataClosed = selectedKhata?.status === "closed"

  // Get available years from purchases data
  const getAvailableYears = () => {
    const years = new Set<string>()
    purchases.forEach((purchase) => {
      const year = new Date(purchase.date).getFullYear().toString()
      years.add(year)
    })
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }
  const availableYears = getAvailableYears()

  const khatasPurchases = purchases.filter((p) => p.khataId === selectedKhataId)
  const filteredPurchases = khatasPurchases.filter((purchase) => {
    // Year filter
    if (selectedYear !== "all") {
      const purchaseYear = new Date(purchase.date).getFullYear().toString()
      if (purchaseYear !== selectedYear) return false
    }

    // Search filter
    if (!searchTerm) return true
    return (
      purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.date.includes(searchTerm)
    )
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPurchases.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage)

  const getCurrencySymbol = (currency: "USD" | "PKR" | "SAR" | "CNY") => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      case "CNY": return "¥"
      default: return ""
    }
  }

  const getKhataTotals = () => {
    const totals: Record<string, number> = { USD: 0, PKR: 0, SAR: 0, CNY: 0 }
    khatasPurchases.forEach((purchase) => {
      totals[purchase.currency] = (totals[purchase.currency] || 0) + purchase.amount
    })
    return totals
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier || formData.items.length === 0 || !formData.description || !formData.amount || !formData.date || !formData.currency) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const amount = Number.parseFloat(formData.amount) || 0
    if (amount < 0) {
      showToast("Amount cannot be negative", "error")
      return
    }

    // For new purchases, require an active khata
    if (!editingPurchase && !activeKhata) {
      showToast("No active Khata found. Please create a Khata first.", "error")
      return
    }

    // Validate that purchase date is within the Khata's date range
    // When editing, use the original khata; when creating, use the active khata
    const targetKhata = editingPurchase 
      ? khatas.find(k => k.id === editingPurchase.khataId) 
      : activeKhata
    
    if (targetKhata) {
      const purchaseDate = new Date(formData.date)
      const khataStartDate = new Date(targetKhata.startDate)
      const khataEndDate = new Date(targetKhata.endDate)
      
      if (purchaseDate < khataStartDate || purchaseDate > khataEndDate) {
        showToast(
          `Purchase date must be between ${formatDisplayDate(targetKhata.startDate)} and ${formatDisplayDate(targetKhata.endDate)}`,
          "error"
        )
        return
      }
    }

    const purchaseData: Purchase = {
      id: editingPurchase ? editingPurchase.id : Date.now().toString(),
      supplier: formData.supplier,
      item: formData.items.join(", "),
      description: formData.description,
      amount: amount,
      currency: formData.currency,
      date: formData.date,
      // Keep the original khataId when editing, use activeKhata for new purchases
      khataId: editingPurchase ? editingPurchase.khataId : activeKhata.id,
    }

    try {
      if (editingPurchase) {
        await purchasesAPI.update(purchaseData)
        showToast("Purchase updated successfully!", "success")
      } else {
        await purchasesAPI.create(purchaseData)
        showToast("Purchase added successfully!", "success")
      }
      await loadData()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save purchase", "error")
      console.error("Error saving purchase:", error)
    }
  }

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    const itemsArray = purchase.item ? purchase.item.split(", ").map(i => i.trim()) : []
    setFormData({
      supplier: purchase.supplier,
      item: purchase.item,
      items: itemsArray,
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
      await loadData()
      showToast("Purchase deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete purchase", "error")
      console.error("Error deleting purchase:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      supplier: "",
      item: "",
      items: [],
      description: "",
      amount: "",
      currency: "USD",
      date: new Date().toISOString().split('T')[0],
    })
    setEditingPurchase(null)
  }

  const handleCreateKhata = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!khataForm.name || !khataForm.startDate || !khataForm.endDate) {
      showToast("Please fill in all Khata fields", "error")
      return
    }
    try {
      const newKhata = await purchaseKhatasAPI.create(khataForm)
      showToast("Purchase Khata created successfully! Previous Khata has been closed.", "success")
      setIsKhataDialogOpen(false)
      setKhataForm({ name: "", startDate: new Date().toISOString().split('T')[0], endDate: "" })
      await loadData()
      setSelectedKhataId(newKhata.id)
    } catch (error) {
      showToast("Failed to create Purchase Khata", "error")
      console.error("Error creating purchase khata:", error)
    }
  }

  const handleDeleteKhataClick = (khata: Khata) => {
    // Check if there are any purchases associated with this khata
    const khataPurchases = purchases.filter((purchase) => purchase.khataId === khata.id)
    
    if (khataPurchases.length > 0) {
      showToast("Please first delete all purchases in this Khata, then you can delete the Khata", "error")
      return
    }
    
    // If no purchases, show confirmation modal
    setDeleteKhataModal({ isOpen: true, khata })
  }

  const handleDeleteKhata = async () => {
    if (!deleteKhataModal.khata) return
    
    try {
      await purchaseKhatasAPI.delete(deleteKhataModal.khata.id)
      showToast("Khata deleted successfully!", "success")
      setDeleteKhataModal({ isOpen: false, khata: null })
      await loadData()
      
      // Select another khata if the deleted one was selected
      if (selectedKhataId === deleteKhataModal.khata.id) {
        setSelectedKhataId(null)
      }
    } catch (error) {
      showToast("Failed to delete Khata", "error")
      console.error("Error deleting khata:", error)
    }
  }

  const closeDeleteKhataModal = () => {
    setDeleteKhataModal({ isOpen: false, khata: null })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchases</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your purchase records by Khata</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setKhataForm({
                  name: "",
                  startDate: activeKhata ? activeKhata.endDate : new Date().toISOString().split('T')[0],
                  endDate: "",
                })
                setIsKhataDialogOpen(true)
              }}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              New Khata
            </button>
            {activeKhata && (
              <button
                onClick={() => { resetForm(); setIsDialogOpen(true) }}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Purchase
              </button>
            )}
          </div>
        </div>

        {/* Active Khata Banner */}
        {activeKhata ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Active Khata: {activeKhata.name}</span>
              <span className="text-sm text-green-600">
                ({formatDisplayDate(activeKhata.startDate)} – {formatDisplayDate(activeKhata.endDate)})
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm font-medium">
              No active Khata. Click "New Khata" to create one before adding purchases.
            </p>
          </div>
        )}

        {/* Khata Selector */}
        {khatas.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Khata to View</h3>
            <div className="flex flex-wrap gap-2">
              {khatas.map((khata) => (
                <div key={khata.id} className="flex items-center gap-1 group">
                  <button
                    onClick={() => setSelectedKhataId(khata.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedKhataId === khata.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {khata.status === "closed" && <Lock className="h-3 w-3" />}
                    {khata.name}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      khata.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-500"
                    }`}>
                      {khata.status}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteKhataClick(khata)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Delete Khata"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Khata Totals */}
        {selectedKhata && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              {isSelectedKhataClosed && <Lock className="h-4 w-4 text-gray-400" />}
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedKhata.name} — Totals
              </h3>
              <span className="text-sm text-gray-500">
                ({formatDisplayDate(selectedKhata.startDate)} – {formatDisplayDate(selectedKhata.endDate)})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(["USD", "PKR", "SAR", "CNY"] as const).map((cur) => (
                <div key={cur} className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-red-600">{cur}</p>
                  <p className="text-lg font-bold text-red-700">
                    {getCurrencySymbol(cur)}{(getKhataTotals()[cur] || 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {selectedKhata ? (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedKhata.name} — Purchase Records
                  {isSelectedKhataClosed && (
                    <span className="ml-2 text-xs font-normal text-gray-400 inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Read-only
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center space-x-2 flex-1">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by supplier, item, description, or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[120px]"
                  >
                    <option value="all">All Years</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">Loading...</td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                        No purchase records in this Khata
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm">{formatDisplayDate(purchase.date)}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm">{purchase.supplier}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm">{purchase.item}</td>
                        <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm">{purchase.description}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                          {getCurrencySymbol(purchase.currency)}{(purchase.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm">{purchase.currency}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button onClick={() => handleEdit(purchase)} className="p-1 text-blue-600 hover:text-blue-800">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteModal({ isOpen: true, purchase })} className="p-1 text-red-600 hover:text-red-800">
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
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No Khata selected. Create a new Khata to start adding purchases.
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredPurchases.length}
          />
        )}

        {/* Add/Edit Purchase Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex !mt-0 items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-1">{editingPurchase ? "Edit Purchase" : "Add New Purchase"}</h3>
              {(() => {
                // Show the khata that the purchase belongs to when editing, otherwise show active khata
                const displayKhata = editingPurchase 
                  ? khatas.find(k => k.id === editingPurchase.khataId)
                  : activeKhata
                
                return displayKhata && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500">
                      Khata: <span className={`font-medium ${displayKhata.status === 'active' ? 'text-green-700' : 'text-gray-600'}`}>
                        {displayKhata.name}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Date Range: <span className="font-medium text-blue-600">
                        {formatDisplayDate(displayKhata.startDate)} - {formatDisplayDate(displayKhata.endDate)}
                      </span>
                    </p>
                  </div>
                )
              })()}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  {(() => {
                    // Use the correct khata for date validation
                    const targetKhata = editingPurchase 
                      ? khatas.find(k => k.id === editingPurchase.khataId)
                      : activeKhata
                    
                    return (
                      <>
                        <DateInput
                          value={formData.date}
                          min={targetKhata?.startDate}
                          max={targetKhata?.endDate}
                          onChange={(value) => setFormData({ ...formData, date: value })}
                          className="text-sm"
                          required
                        />
                        {targetKhata && (
                          <p className="text-xs text-gray-500 mt-1">
                            Must be between {formatDisplayDate(targetKhata.startDate)} and {formatDisplayDate(targetKhata.endDate)}
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Enter supplier name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items * (Select one or more)</label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-white">
                    {products.length === 0 ? (
                      <p className="text-sm text-gray-500">No products available</p>
                    ) : (
                      <div className="space-y-2">
                        {products.map((product) => (
                          <label key={product.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={formData.items.includes(product.name)}
                              onChange={(e) => {
                                const newItems = e.target.checked
                                  ? [...formData.items, product.name]
                                  : formData.items.filter(item => item !== product.name)
                                setFormData({ ...formData, items: newItems })
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{product.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.items.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {formData.items.join(", ")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" | "CNY" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="USD">Dollar (USD)</option>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                    <option value="CNY">Chinese Yuan (CNY)</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">{editingPurchase ? "Update" : "Add"} Purchase</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Khata Modal */}
        {isKhataDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex !mt-0 items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-1">Create New Khata</h3>
              {activeKhata && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  Creating a new Khata will close the current active Khata: <strong>{activeKhata.name}</strong>
                </div>
              )}
              <form onSubmit={handleCreateKhata} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khata Name *</label>
                  <input
                    type="text"
                    value={khataForm.name}
                    onChange={(e) => setKhataForm({ ...khataForm, name: e.target.value })}
                    placeholder="e.g. Jan–Jun 2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <DateInput
                    value={khataForm.startDate}
                    onChange={(value) => setKhataForm({ ...khataForm, startDate: value })}
                    placeholder="dd/mm/yyyy"
                    className="text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <DateInput
                    value={khataForm.endDate}
                    onChange={(value) => setKhataForm({ ...khataForm, endDate: value })}
                    min={khataForm.startDate}
                    placeholder="dd/mm/yyyy"
                    className="text-sm"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button type="button" onClick={() => setIsKhataDialogOpen(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">Create Khata</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        <DeleteModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, purchase: null })}
          onConfirm={() => deleteModal.purchase && handleDelete(deleteModal.purchase.id)}
          title="Delete Purchase"
          message="Are you sure you want to delete this purchase? This action cannot be undone."
        />

        {/* Delete Khata Modal */}
        <DeleteModal
          isOpen={deleteKhataModal.isOpen}
          onClose={closeDeleteKhataModal}
          onConfirm={handleDeleteKhata}
          title="Delete Khata"
          message={`Are you sure you want to delete the Khata "${deleteKhataModal.khata?.name}"? This action cannot be undone.`}
        />
      </div>
    </DashboardLayout>
  )
}
