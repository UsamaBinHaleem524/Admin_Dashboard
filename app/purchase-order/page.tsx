"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout" // Ensure this path and export are correct
import { Plus, Edit, Trash2, Search, Download } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import { purchaseOrdersAPI, productsAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"
import jsPDF from "jspdf"
import { getCompanyProfile, getDefaultCompanyProfile } from "@/lib/company-profile-utils"

interface Product {
  id: string
  name: string
  date: string
}

interface PurchaseOrderItem {
  itemName: string
  quantity: number
  unitPrice: number
  amount: number
}

interface PurchaseOrder {
  id: string
  userDefinedId: string
  supplier: string
  supplierAddress?: string
  supplierPhone?: string
  date: string
  items: PurchaseOrderItem[]
  totalAmount: number
  currency: "USD" | "PKR" | "SAR"
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; purchaseOrder: PurchaseOrder | null }>({
    isOpen: false,
    purchaseOrder: null,
  })
  const [formData, setFormData] = useState({
    userDefinedId: "",
    supplier: "",
    supplierAddress: "",
    supplierPhone: "",
    date: new Date().toISOString().split('T')[0],
    items: [{ itemName: "", quantity: "", unitPrice: "", amount: "" }],
    currency: "USD" as "USD" | "PKR" | "SAR",
  })
  console.log(">>>>>formdAta", formData);
  const { showToast } = useToast()

  useEffect(() => {
    loadPurchaseOrders()
    loadProducts()
  }, [])

  useEffect(() => {
    filterPurchaseOrders()
  }, [purchaseOrders, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true)
      const data = await purchaseOrdersAPI.getAll()
      setPurchaseOrders(data)
    } catch (error: any) {
      // Extract error message from API response
      let errorMessage = "Failed to load purchase orders"
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      }
      
      showToast(errorMessage, "error")
      console.error("Error loading purchase orders:", error)
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

  const savePurchaseOrders = async (newPurchaseOrders: PurchaseOrder[]) => {
    setPurchaseOrders(newPurchaseOrders)
  }

  const filterPurchaseOrders = () => {
    if (!searchTerm) {
      setFilteredPurchaseOrders(purchaseOrders)
    } else {
      const filtered = purchaseOrders.filter(
        (po) =>
          po.userDefinedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (po.supplierAddress && po.supplierAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (po.supplierPhone && po.supplierPhone.toLowerCase().includes(searchTerm.toLowerCase())) ||
          po.currency.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredPurchaseOrders(filtered)
    }
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemName: "", quantity: "", unitPrice: "", amount: "" }],
    })
  }

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === "quantity" || field === "unitPrice") {
      const quantity = Number.parseFloat(newItems[index].quantity || "0")
      const unitPrice = Number.parseFloat(newItems[index].unitPrice || "0")
      newItems[index].amount = (quantity * unitPrice).toFixed(2)
    }

    setFormData({ ...formData, items: newItems })
  }

  const calculateTotalAmount = () => {
    return formData.items
      .reduce((sum, item) => {
        const quantity = Number.parseFloat(item.quantity || "0")
        const unitPrice = Number.parseFloat(item.unitPrice || "0")
        return sum + (quantity * unitPrice)
      }, 0)
      .toFixed(2)
  }

  const getCurrencySymbol = (currency: "USD" | "PKR" | "SAR") => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      default: return ""
    }
  }

  const calculatePurchaseOrderTotal = (purchaseOrder: PurchaseOrder) => {
    // If totalAmount is 0 or missing, calculate it from items
    if (!purchaseOrder.totalAmount || purchaseOrder.totalAmount === 0) {
      return purchaseOrder.items.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.unitPrice || 0))
      }, 0)
    }
    return purchaseOrder.totalAmount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.userDefinedId) {
      showToast("Please enter a Purchase Order ID", "error")
      return
    }

    if (!formData.supplier || !formData.currency || formData.items.some(item => !item.itemName || !item.quantity || !item.unitPrice)) {
      showToast("Please fill in all required fields for all items", "error")
      return
    }

    // Calculate total amount and ensure all item amounts are correct
    const calculatedItems = formData.items.map(item => {
      const quantity = Number.parseFloat(item.quantity)
      const unitPrice = Number.parseFloat(item.unitPrice)
      const amount = quantity * unitPrice
      
      return {
        itemName: item.itemName,
        quantity,
        unitPrice,
        amount,
      }
    })

    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.amount, 0)

    const purchaseOrderData: PurchaseOrder = {
      id: editingPurchaseOrder ? editingPurchaseOrder.id : "",
      userDefinedId: formData.userDefinedId,
      supplier: formData.supplier,
      supplierAddress: formData.supplierAddress,
      supplierPhone: formData.supplierPhone,
      date: formData.date,
      items: calculatedItems,
      totalAmount,
      currency: formData.currency,
    }

    try {
      if (editingPurchaseOrder) {
        await purchaseOrdersAPI.update(purchaseOrderData)
        showToast("Purchase order updated successfully!", "success")
      } else {
        await purchaseOrdersAPI.create(purchaseOrderData)
        showToast("Purchase order added successfully!", "success")
      }
      
      await loadPurchaseOrders()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      // Extract error message from API response
      let errorMessage = "Failed to save purchase order"
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      }
      
      showToast(errorMessage, "error")
      console.error("Error saving purchase order:", error)
    }
  }

  const handleEdit = (purchaseOrder: PurchaseOrder) => {
    setEditingPurchaseOrder(purchaseOrder)
    setFormData({
      userDefinedId: purchaseOrder.userDefinedId,
      supplier: purchaseOrder.supplier,
      supplierAddress: purchaseOrder.supplierAddress || "",
      supplierPhone: purchaseOrder.supplierPhone || "",
      date: purchaseOrder.date,
      items: purchaseOrder.items.map(item => {
        // Recalculate amount to ensure it's correct
        const calculatedAmount = item.quantity * item.unitPrice
        
        return {
          itemName: item.itemName,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          amount: calculatedAmount.toFixed(2),
        }
      }),
      currency: purchaseOrder.currency,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await purchaseOrdersAPI.delete(id)
      await loadPurchaseOrders()
      showToast("Purchase order deleted successfully!", "success")
    } catch (error: any) {
      // Extract error message from API response
      let errorMessage = "Failed to delete purchase order"
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      }
      
      showToast(errorMessage, "error")
      console.error("Error deleting purchase order:", error)
    }
  }

  const openDeleteModal = (purchaseOrder: PurchaseOrder) => {
    setDeleteModal({ isOpen: true, purchaseOrder })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, purchaseOrder: null })
  }

  const handleDownloadPDF = async (po: PurchaseOrder) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
  
      // Get company profile data
      const companyProfile = await getCompanyProfile() || getDefaultCompanyProfile();
  
      // Logo (top-left corner) - larger size like in the reference
      try {
        const logoResponse = await fetch('/logo.jpeg');
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(logoBlob);
        });
        doc.addImage(logoBase64 as string, 'JPEG', 15, 15, 35, 35);
      } catch (error) {
        // Fallback to placeholder if logo fails to load
        const imgData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        doc.addImage(imgData, 'PNG', 15, 15, 35, 35);
      }
  
      // Purchase Order Header Section (Right side)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(po.userDefinedId || 'PURCHASE ORDER', pageWidth - 25, 25, { align: "right" });

      // Purchase Order details (right side)
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`PO Date: ${po.date}`, pageWidth - 25, 35, { align: "right" });
  
      // Sender Information (Left side - Company details)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(companyProfile.name || 'Company Name', 15, 60);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(companyProfile.contact || 'Contact Person', 15, 70);
      doc.text(companyProfile.address || 'Company Address', 15, 77);
      doc.text(companyProfile.email || 'Phone Number', 15, 84);

      // Supplier Information (Right side)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(po.supplier || 'Supplier Name', pageWidth - 80, 60, { align: "left" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Add supplier address if available (same left position, with text wrapping)
      if (po.supplierAddress) {
        const addressLines = doc.splitTextToSize(po.supplierAddress, 60); // 60 units width for wrapping
        doc.text(addressLines, pageWidth - 80, 70, { align: "left" });
      }
      
      // Add supplier phone if available (aligned with name)
      if (po.supplierPhone) {
        doc.text(po.supplierPhone, pageWidth - 80, 77, { align: "left" });
      }
  
      // Table Section
      let y = 110;
      
      // Table headers with professional styling
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      const colX = {
        rowNo: 15,
        description: 35,
        date: 85,
        qty: 110,
        unitPrice: 155,
        amount: 193,
      };
  
      // Header row with background
      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - 8, pageWidth - 20, 10, 'F');
      
      doc.text("Row no.", colX.rowNo, y - 2);
      doc.text("Description", colX.description, y - 2);
      doc.text("Date", colX.date, y - 2);
      doc.text("Qty", colX.qty, y - 2, { align: "right" });
      doc.text("Unit price", colX.unitPrice, y - 2, { align: "right" });
      doc.text("Amount", colX.amount, y - 2, { align: "right" });
  
      y += 8;
  
      // Table rows
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      po.items.forEach((item, index) => {
        if (y > pageHeight - 80) {
          doc.addPage();
          y = 20;

          // Repeat header on new page
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setFillColor(240, 240, 240);
          doc.rect(10, y - 8, pageWidth - 20, 10, 'F');

          doc.text("Row no.", colX.rowNo, y - 2);
          doc.text("Description", colX.description, y - 2);
          doc.text("Date", colX.date, y - 2);
          doc.text("Qty", colX.qty, y - 2, { align: "right" });
          doc.text("Unit price", colX.unitPrice, y - 2, { align: "right" });
          doc.text("Amount", colX.amount, y - 2, { align: "right" });
          y += 8;
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
        }

        doc.text(`${index + 1}`, colX.rowNo, y);
        doc.text(item.itemName || '', colX.description, y);
        doc.text(po.date || '', colX.date, y);
        doc.text((item.quantity || 0).toString(), colX.qty, y, { align: "right" });
        doc.text(`${getCurrencySymbol(po.currency)}${(item.unitPrice || 0).toFixed(2)}`, colX.unitPrice - 8, y, { align: "center" });
        doc.text(`${getCurrencySymbol(po.currency)}${(item.amount || 0).toFixed(2)}`, colX.amount - 2, y, { align: "right" });
  
        y += 6;
      });
  
      // Add horizontal line after items
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(10, y + 2, pageWidth - 10, y + 2);
  
      // Summary Section (Right side) - Fixed layout
      const summaryX = pageWidth - 60;
      const summaryY = y + 10;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      doc.text("Total Amount:", summaryX, summaryY);
      
      doc.setFont("helvetica", "normal");
      const finalTotal = calculatePurchaseOrderTotal(po);
      doc.text(`${getCurrencySymbol(po.currency)}${finalTotal.toFixed(2)}`, colX.amount-2, summaryY, { align: "right" });
  
      // Footer - Centered with proper styling
      const footerY = pageHeight - 20;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(companyProfile.name || 'Company Name', pageWidth / 2, footerY, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.text(companyProfile.address || 'Company Address', pageWidth / 2, footerY + 6, { align: "center" });
  
      // Save
      doc.save(`Purchase_Order_${po.userDefinedId}.pdf`);
      showToast("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Failed to generate PDF. Please try again.", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      userDefinedId: "",
      supplier: "",
      supplierAddress: "",
      supplierPhone: "",
      date: new Date().toISOString().split('T')[0],
      items: [{ itemName: "", quantity: "", unitPrice: "", amount: "" }],
      currency: "USD",
    })
    setEditingPurchaseOrder(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPurchaseOrders.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPurchaseOrders.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage purchase orders</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Purchase Order
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by PO ID, supplier, address, phone, or currency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:max-w-[32%] flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] hidden md:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                    Items & Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {po.userDefinedId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {po.supplier}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base max-w-xs">
                        <div className="truncate" title={po.supplierAddress || 'No address provided'}>
                          {po.supplierAddress || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {po.supplierPhone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {po.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(po.currency)}{calculatePurchaseOrderTotal(po).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {po.currency}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base min-w-[300px] max-w-[400px]">
                        <ul className="list-disc list-inside">
                          {po.items.map((item, index) => (
                            <li key={index} className="mb-1">
                              <span className="font-medium">{item.itemName}</span>
                              <br />
                              <span className="text-xs text-gray-400">
                                Qty: {item.quantity || 0} | {getCurrencySymbol(po.currency)}{(item.unitPrice || 0).toFixed(2)}/unit | Total: {getCurrencySymbol(po.currency)}{(item.amount || 0).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(po)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(po)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(po)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="md:hidden divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No purchase orders found
                </div>
              ) : (
                currentItems.map((po) => (
                  <div key={po.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{po.id}</p>
                        <p className="text-gray-500 text-sm">Supplier: {po.supplier}</p>
                        {po.supplierAddress && (
                          <p className="text-gray-500 text-sm">Address: {po.supplierAddress}</p>
                        )}
                        {po.supplierPhone && (
                          <p className="text-gray-500 text-sm">Phone: {po.supplierPhone}</p>
                        )}
                        <p className="text-gray-500 text-sm">Date: {po.date}</p>
                        <p className="text-gray-500 text-sm">Total: {getCurrencySymbol(po.currency)}{calculatePurchaseOrderTotal(po).toFixed(2)}</p>
                        <p className="text-gray-500 text-sm">Currency: {po.currency}</p>
                        <ul className="list-disc list-inside text-gray-500 text-sm">
                          {po.items.map((item, index) => (
                            <li key={index}>
                              {item.itemName} (Qty: {item.quantity || 0}, {getCurrencySymbol(po.currency)}{(item.unitPrice || 0).toFixed(2)}/unit, Total: {getCurrencySymbol(po.currency)}{(item.amount || 0).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(po)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(po)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(po)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
            totalItems={filteredPurchaseOrders.length}
          />
        )}

        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 !mt-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingPurchaseOrder ? "Edit Purchase Order" : "Add New Purchase Order"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="userDefinedId" className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Order ID
                  </label>
                  <input
                    id="userDefinedId"
                    type="text"
                    value={formData.userDefinedId}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Auto-add PO- prefix if not present
                      if (value && !value.startsWith('PO-')) {
                        value = 'PO-' + value.replace(/^PO-/, '');
                      }
                      setFormData({ ...formData, userDefinedId: value });
                    }}
                    placeholder="Enter purchase order ID (PO- will be added automatically)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    id="supplier"
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="supplierAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Address
                  </label>
                  <textarea
                    id="supplierAddress"
                    value={formData.supplierAddress}
                    onChange={(e) => setFormData({ ...formData, supplierAddress: e.target.value })}
                    placeholder="Enter supplier address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="supplierPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Phone
                  </label>
                  <input
                    id="supplierPhone"
                    type="text"
                    value={formData.supplierPhone}
                    onChange={(e) => setFormData({ ...formData, supplierPhone: e.target.value })}
                    placeholder="Enter supplier phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="USD">Dollar (USD)</option>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items</label>
                  {formData.items.map((item, index) => (
                    <div key={index} className="border p-4 mb-2 rounded-md relative">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor={`itemName-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                          </label>
                          <select
                            id={`itemName-${index}`}
                            value={item.itemName}
                            onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="" disabled>Select</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.name}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`quantity-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            id={`quantity-${index}`}
                            type="number"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            placeholder="Quantity"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor={`unitPrice-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price
                          </label>
                          <input
                            id={`unitPrice-${index}`}
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                            placeholder="Unit Price"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input
                          type="text"
                          value={`${getCurrencySymbol(formData.currency)}${item.amount}`}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
                        />
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-2 flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Item
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <input
                    type="text"
                    value={`${getCurrencySymbol(formData.currency)}${calculateTotalAmount()}`}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
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
                    {editingPurchaseOrder ? "Update" : "Add"} Purchase Order
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
          onConfirm={() => deleteModal.purchaseOrder && handleDelete(deleteModal.purchaseOrder.id)}
          title="Delete Purchase Order"
          message="Are you sure you want to delete this purchase order? This action cannot be undone."
          itemName={deleteModal.purchaseOrder?.id}
        />
      </div>
    </DashboardLayout>
  )
}