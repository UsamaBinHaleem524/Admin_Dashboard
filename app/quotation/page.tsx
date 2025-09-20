"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, Download } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import { quotationsAPI, productsAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"
import jsPDF from "jspdf"
import { getCompanyProfile, getDefaultCompanyProfile } from "@/lib/company-profile-utils"

interface Product {
  id: string
  name: string
  date: string
}

interface QuotationItem {
  itemName: string
  amount: number
}

interface Quotation {
  id: string
  userDefinedId: string
  date: string
  customerSupplierDetails: "customer" | "supplier"
  customerSupplierName: string
  customerSupplierAddress?: string
  customerSupplierPhone?: string
  items: QuotationItem[]
  totalAmount: number
  currency: "USD" | "PKR" | "SAR"
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; quotation: Quotation | null }>({
    isOpen: false,
    quotation: null,
  })
  const [formData, setFormData] = useState({
    userDefinedId: "",
    date: new Date().toISOString().split('T')[0],
    customerSupplierDetails: "customer" as "customer" | "supplier",
    customerSupplierName: "",
    customerSupplierAddress: "",
    customerSupplierPhone: "",
    items: [{ itemName: "", amount: "" }],
    currency: "USD" as "USD" | "PKR" | "SAR",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadQuotations()
    loadProducts()
  }, [])

  useEffect(() => {
    filterQuotations()
  }, [quotations, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadQuotations = async () => {
    try {
      setLoading(true)
      const data = await quotationsAPI.getAll()
      setQuotations(data)
    } catch (error) {
      showToast("Failed to load quotations", "error")
      console.error("Error loading quotations:", error)
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

  const saveQuotations = async (newQuotations: Quotation[]) => {
    setQuotations(newQuotations)
  }

  const filterQuotations = () => {
    if (!searchTerm) {
      setFilteredQuotations(quotations)
    } else {
      const filtered = quotations.filter(
        (q) =>
          q.userDefinedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.customerSupplierDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.customerSupplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (q.customerSupplierAddress && q.customerSupplierAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (q.customerSupplierPhone && q.customerSupplierPhone.toLowerCase().includes(searchTerm.toLowerCase())) ||
          q.items.some(item => 
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
      setFilteredQuotations(filtered)
    }
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemName: "", amount: "" }],
    })
  }

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index: number, field: keyof QuotationItem, value: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
  }

  const calculateTotalAmount = () => {
    return formData.items
      .reduce((sum, item) => sum + Number.parseFloat(item.amount || "0"), 0)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.userDefinedId) {
      showToast("Please enter a Quotation ID", "error")
      return
    }

    if (formData.items.some(item => !item.itemName || !item.amount)) {
      showToast("Please fill in all required fields for all items", "error")
      return
    }

    if (!formData.currency || !formData.customerSupplierDetails) {
      showToast("Please select a currency and customer/supplier details", "error")
      return
    }

    if (!formData.customerSupplierName) {
      showToast(`Please enter ${formData.customerSupplierDetails === 'customer' ? 'customer' : 'supplier'} name`, "error")
      return
    }

    const totalAmount = Number.parseFloat(calculateTotalAmount())

    const quotationData: Quotation = {
      id: editingQuotation ? editingQuotation.id : "",
      userDefinedId: formData.userDefinedId,
      date: formData.date,
      customerSupplierDetails: formData.customerSupplierDetails,
      customerSupplierName: formData.customerSupplierName,
      customerSupplierAddress: formData.customerSupplierAddress,
      customerSupplierPhone: formData.customerSupplierPhone,
      items: formData.items.map(item => ({
        itemName: item.itemName,
        amount: Number.parseFloat(item.amount),
      })),
      totalAmount,
      currency: formData.currency,
    }

    try {
      if (editingQuotation) {
        await quotationsAPI.update(quotationData)
        showToast("Quotation updated successfully!", "success")
      } else {
        await quotationsAPI.create(quotationData)
        showToast("Quotation added successfully!", "success")
      }
      
      await loadQuotations()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save quotation", "error")
      console.error("Error saving quotation:", error)
    }
  }

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation)
    setFormData({
      userDefinedId: quotation.userDefinedId,
      date: quotation.date,
      customerSupplierDetails: quotation.customerSupplierDetails,
      customerSupplierName: quotation.customerSupplierName,
      customerSupplierAddress: quotation.customerSupplierAddress || "",
      customerSupplierPhone: quotation.customerSupplierPhone || "",
      items: quotation.items.map(item => ({
        itemName: item.itemName,
        amount: item.amount.toString(),
      })),
      currency: quotation.currency,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await quotationsAPI.delete(id)
      await loadQuotations()
      showToast("Quotation deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete quotation", "error")
      console.error("Error deleting quotation:", error)
    }
  }

  const openDeleteModal = (quotation: Quotation) => {
    setDeleteModal({ isOpen: true, quotation })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, quotation: null })
  }
  const handleDownloadPDF = async (q: Quotation) => {
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
  
      // Quotation Header Section (Right side)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(q.userDefinedId || 'QUOTATION', pageWidth - 25, 25, { align: "right" });

      // Quotation details (right side)
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Quotation Date: ${q.date}`, pageWidth - 25, 35, { align: "right" });
      doc.text(`Type: ${q.customerSupplierDetails === 'customer' ? 'Customer' : 'Supplier'}`, pageWidth - 25, 45, { align: "right" });
  
      // Sender Information (Left side - Company details)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(companyProfile.name || 'Company Name', 15, 60);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(companyProfile.contact || 'Contact Person', 15, 70);
      doc.text(companyProfile.address || 'Company Address', 15, 77);
      doc.text(companyProfile.email || 'Phone Number', 15, 84);

      // Customer/Supplier Information (Right side) - with equal vertical spacing
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(q.customerSupplierName || `${q.customerSupplierDetails === 'customer' ? 'Customer' : 'Supplier'} Name`, pageWidth - 80, 66, { align: "left" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Add customer/supplier address if available with proper spacing
      if (q.customerSupplierAddress) {
        const addressLines = doc.splitTextToSize(q.customerSupplierAddress, 60); // 60 units width for wrapping
        doc.text(addressLines, pageWidth - 80, 72, { align: "left" });
      }
      
      // Add customer/supplier phone if available with proper spacing
      if (q.customerSupplierPhone) {
        doc.text(q.customerSupplierPhone, pageWidth - 80, 82, { align: "left" });
      }
  
      // Table Section
      let y = 110;
      
      // Table headers with professional styling
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      const colX = {
        rowNo: 15,
        itemName: 35,
        date: 85,
        currency: 125,
        amount: 195,
      };
  
      // Header row with background
      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - 8, pageWidth - 20, 10, 'F');
      
      doc.text("Row no.", colX.rowNo, y - 2);
      doc.text("Item Name", colX.itemName, y - 2);
      doc.text("Date", colX.date, y - 2);
      doc.text("Currency", colX.currency, y - 2);
      doc.text("Amount", colX.amount, y - 2, { align: "right" });
  
      y += 8;
  
      // Table rows
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      q.items.forEach((item, index) => {
        if (y > pageHeight - 80) {
          doc.addPage();
          y = 20;

          // Repeat header on new page
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setFillColor(240, 240, 240);
          doc.rect(10, y - 8, pageWidth - 20, 10, 'F');

          doc.text("Row no.", colX.rowNo, y - 2);
          doc.text("Item Name", colX.itemName, y - 2);
          doc.text("Date", colX.date, y - 2);
          doc.text("Currency", colX.currency, y - 2);
          doc.text("Amount", colX.amount, y - 2, { align: "right" });
          y += 8;
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
        }

        doc.text(`${index + 1}`, colX.rowNo, y);
        doc.text(item.itemName || '', colX.itemName, y);
        doc.text(q.date || '', colX.date, y);
        doc.text(q.currency || '', colX.currency, y);
        doc.text(`${getCurrencySymbol(q.currency)}${(item.amount || 0).toFixed(2)}`, colX.amount, y, { align: "right" });
  
        y += 6;
      });
  
      // Add horizontal line after items
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(10, y + 2, pageWidth - 10, y + 2);
  
      // Summary Section (Right side) - Fixed layout
      const summaryX = pageWidth - 80;
      const summaryY = y + 10;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      doc.text("Total Amount:", summaryX+20, summaryY);
      
      doc.setFont("helvetica", "normal");
      const finalTotal = q.totalAmount || 0;
      doc.text(`${getCurrencySymbol(q.currency)}${finalTotal.toFixed(2)}`, colX.amount, summaryY, { align: "right" });
  
      // Footer - Centered with proper styling
      const footerY = pageHeight - 20;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(companyProfile.name || 'Company Name', pageWidth / 2, footerY, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.text(companyProfile.address || 'Company Address', pageWidth / 2, footerY + 6, { align: "center" });
  
      // Save
      doc.save(`Quotation_${q.userDefinedId}.pdf`);
      showToast("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Failed to generate PDF. Please try again.", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      userDefinedId: "",
      date: new Date().toISOString().split('T')[0],
      customerSupplierDetails: "customer",
      customerSupplierName: "",
      customerSupplierAddress: "",
      customerSupplierPhone: "",
      items: [{ itemName: "", amount: "" }],
      currency: "USD",
    })
    setEditingQuotation(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredQuotations.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage quotations</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Quotation
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                    placeholder="Search by quotation ID, customer/supplier name, address, phone, or item name"
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
                    Quotation ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer/Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
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
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No quotations found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {q.userDefinedId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {q.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          q.customerSupplierDetails === 'customer' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {q.customerSupplierDetails === 'customer' ? 'Customer' : 'Supplier'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {q.customerSupplierName}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base max-w-[200px]">
                        <div className="truncate" title={q.customerSupplierAddress || "-"}>
                          {q.customerSupplierAddress || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {q.customerSupplierPhone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(q.currency)}{(q.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {q.currency}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base min-w-[300px] max-w-[400px]">
                        <ul className="list-disc list-inside">
                          {q.items.map((item, index) => (
                            <li key={index} className="mb-1">
                              <span className="font-medium">{item.itemName}</span><br />
                              <span className="text-xs text-gray-400">
                                Amount: {getCurrencySymbol(q.currency)}{(item.amount || 0).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(q)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(q)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(q)}
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
                  No quotations found
                </div>
              ) : (
                currentItems.map((q) => (
                  <div key={q.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{q.userDefinedId}</p>
                        <p className="text-gray-500 text-sm">Date: {q.date}</p>
                        <p className="text-gray-500 text-sm">
                          Type: <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            q.customerSupplierDetails === 'customer' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {q.customerSupplierDetails === 'customer' ? 'Customer' : 'Supplier'}
                          </span>
                        </p>
                        <p className="text-gray-500 text-sm">
                          {q.customerSupplierDetails === 'customer' ? 'Customer' : 'Supplier'}: {q.customerSupplierName}
                        </p>
                        {q.customerSupplierAddress && (
                          <p className="text-gray-500 text-sm">
                            Address: {q.customerSupplierAddress}
                          </p>
                        )}
                        {q.customerSupplierPhone && (
                          <p className="text-gray-500 text-sm">
                            Phone: {q.customerSupplierPhone}
                          </p>
                        )}
                        <p className="text-gray-500 text-sm">Total: {getCurrencySymbol(q.currency)}{(q.totalAmount || 0).toFixed(2)}</p>
                        <p className="text-gray-500 text-sm">Currency: {q.currency}</p>
                        <ul className="list-disc list-inside text-gray-500 text-sm">
                          {q.items.map((item, index) => (
                            <li key={index}>
                              {item.itemName} (Amount: {getCurrencySymbol(q.currency)}{(item.amount || 0).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(q)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(q)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(q)}
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
            totalItems={filteredQuotations.length}
          />
        )}

        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 !mt-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingQuotation ? "Edit Quotation" : "Add New Quotation"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="userDefinedId" className="block text-sm font-medium text-gray-700 mb-1">
                    Quotation ID
                  </label>
                  <input
                    id="userDefinedId"
                    type="text"
                    value={formData.userDefinedId}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Auto-add QO- prefix if not present
                      if (value && !value.startsWith('QO-')) {
                        value = 'QO-' + value.replace(/^QO-/, '');
                      }
                      setFormData({ ...formData, userDefinedId: value });
                    }}
                    placeholder="Enter quotation ID (QO- will be added automatically)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="customerSupplierDetails" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer/Supplier Details
                  </label>
                  <select
                    id="customerSupplierDetails"
                    value={formData.customerSupplierDetails}
                    onChange={(e) => setFormData({ ...formData, customerSupplierDetails: e.target.value as "customer" | "supplier" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="customerSupplierName" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.customerSupplierDetails === 'customer' ? 'Customer Name' : 'Supplier Name'}
                  </label>
                  <input
                    id="customerSupplierName"
                    type="text"
                    value={formData.customerSupplierName}
                    onChange={(e) => setFormData({ ...formData, customerSupplierName: e.target.value })}
                    placeholder={`Enter ${formData.customerSupplierDetails === 'customer' ? 'customer' : 'supplier'} name`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="customerSupplierAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.customerSupplierDetails === 'customer' ? 'Customer Address' : 'Supplier Address'}
                  </label>
                  <textarea
                    id="customerSupplierAddress"
                    value={formData.customerSupplierAddress}
                    onChange={(e) => setFormData({ ...formData, customerSupplierAddress: e.target.value })}
                    placeholder={`Enter ${formData.customerSupplierDetails === 'customer' ? 'customer' : 'supplier'} address`}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="customerSupplierPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.customerSupplierDetails === 'customer' ? 'Customer Phone' : 'Supplier Phone'}
                  </label>
                  <input
                    id="customerSupplierPhone"
                    type="text"
                    value={formData.customerSupplierPhone}
                    onChange={(e) => setFormData({ ...formData, customerSupplierPhone: e.target.value })}
                    placeholder={`Enter ${formData.customerSupplierDetails === 'customer' ? 'customer' : 'supplier'} phone number`}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor={`itemName-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                          </label>
                          <select
                            id={`itemName-${index}`}
                            value={item.itemName}
                            onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-500"
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
                          <label htmlFor={`amount-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Amount
                          </label>
                          <input
                            id={`amount-${index}`}
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                            placeholder="Enter amount"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
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
                    {editingQuotation ? "Update" : "Add"} Quotation
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
          onConfirm={() => deleteModal.quotation && handleDelete(deleteModal.quotation.id)}
          title="Delete Quotation"
          message="Are you sure you want to delete this quotation? This action cannot be undone."
          itemName={deleteModal.quotation?.id}
        />
      </div>
    </DashboardLayout>
  )
}