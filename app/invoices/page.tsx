"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, Download } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import { invoicesAPI, productsAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"
import jsPDF from "jspdf"
import { getCompanyProfile, getDefaultCompanyProfile } from "@/lib/company-profile-utils"

interface Product {
  id: string
  name: string
  date: string
}

interface InvoiceItem {
  itemName: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  vatPercentage: number
  amount: number
}

interface Invoice {
  id: string
  userDefinedId: string
  date: string
  invoiceType: "Simple" | "Proforma"
  items: InvoiceItem[]
  totalAmount: number
  currency: "USD" | "PKR" | "SAR"
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; invoice: Invoice | null }>({
    isOpen: false,
    invoice: null,
  })
  const [formData, setFormData] = useState({
    userDefinedId: "",
    date: new Date().toISOString().split('T')[0],
    invoiceType: "Simple" as "Simple" | "Proforma",
    items: [{ itemName: "", description: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
    currency: "USD" as "USD" | "PKR" | "SAR",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadInvoices()
    loadProducts()
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const data = await invoicesAPI.getAll()
      setInvoices(data)
    } catch (error) {
      showToast("Failed to load invoices", "error")
      console.error("Error loading invoices:", error)
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

  const saveInvoices = async (newInvoices: Invoice[]) => {
    setInvoices(newInvoices)
  }

  const filterInvoices = () => {
    if (!searchTerm) {
      setFilteredInvoices(invoices)
    } else {
      const filtered = invoices.filter(
        (inv) =>
          inv.userDefinedId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.invoiceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.items.some(item => 
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
      setFilteredInvoices(filtered)
    }
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemName: "", description: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
    })
  }

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === "quantity" || field === "unitPrice" || field === "vatPercentage") {
      const quantity = Number.parseFloat(newItems[index].quantity || "0")
      const unitPrice = Number.parseFloat(newItems[index].unitPrice || "0")
      const vatPercentage = Number.parseFloat(newItems[index].vatPercentage || "0")
      const subtotal = quantity * unitPrice
      const vatAmount = subtotal * (vatPercentage / 100)
      newItems[index].amount = (subtotal + vatAmount).toFixed(2)
    }

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
      showToast("Please enter an Invoice ID", "error")
      return
    }

    if (formData.items.some(item => !item.itemName || !item.description || !item.quantity || !item.unit || !item.unitPrice || !item.vatPercentage)) {
      showToast("Please fill in all required fields for all items", "error")
      return
    }

    if (!formData.invoiceType || !formData.currency) {
      showToast("Please select an invoice type and currency", "error")
      return
    }

    const totalAmount = Number.parseFloat(calculateTotalAmount())

    const invoiceData: Invoice = {
      id: editingInvoice ? editingInvoice.id : "",
      userDefinedId: formData.userDefinedId,
      date: formData.date,
      invoiceType: formData.invoiceType,
      items: formData.items.map(item => ({
        itemName: item.itemName,
        description: item.description,
        quantity: Number.parseFloat(item.quantity),
        unit: item.unit,
        unitPrice: Number.parseFloat(item.unitPrice),
        vatPercentage: Number.parseFloat(item.vatPercentage),
        amount: Number.parseFloat(item.amount),
      })),
      totalAmount,
      currency: formData.currency,
    }

    try {
      if (editingInvoice) {
        await invoicesAPI.update(invoiceData)
        showToast("Invoice updated successfully!", "success")
      } else {
        await invoicesAPI.create(invoiceData)
        showToast("Invoice added successfully!", "success")
      }
      
      await loadInvoices()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save invoice", "error")
      console.error("Error saving invoice:", error)
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      userDefinedId: invoice.userDefinedId,
      date: invoice.date,
      invoiceType: invoice.invoiceType,
      items: invoice.items.map(item => ({
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: item.unitPrice.toString(),
        vatPercentage: item.vatPercentage.toString(),
        amount: item.amount.toString(),
      })),
      currency: invoice.currency,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await invoicesAPI.delete(id)
      await loadInvoices()
      showToast("Invoice deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete invoice", "error")
      console.error("Error deleting invoice:", error)
    }
  }

  const openDeleteModal = (invoice: Invoice) => {
    setDeleteModal({ isOpen: true, invoice })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, invoice: null })
  }

  const handleDownloadPDF = async (inv: Invoice) => {
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
  
            // Invoice Header Section (Right side)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(inv.userDefinedId || 'INVOICE', pageWidth - 25, 25, { align: "right" });

      // Invoice details (right side)
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice Date: ${inv.date}`, pageWidth - 25, 35, { align: "right" });
  
      // Sender Information (Left side - Company details)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(companyProfile.name || 'Company Name', 15, 60);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(companyProfile.contact || 'Contact Person', 15, 70);
      doc.text(companyProfile.address || 'Company Address', 15, 77);
      doc.text(companyProfile.email || 'Phone Number', 15, 84);
  
      // Receiver Information (Right side)
      const receiverY = 60;
      doc.setFontSize(12);
  
      // Table Section
      let y = 110;
      
      // Table headers with professional styling
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      
      const colX = {
        rowNo: 15,
        description: 35,
        date: 85,
        qty: 105,
        unit: 125,
        unitPrice: 145,
        vat: 165,
        total: 185,
      };
  
      // Header row with background
      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - 5, pageWidth - 20, 12, 'F');
      
      doc.text("Row no.", colX.rowNo, y);
      doc.text("Description", colX.description, y);
      doc.text("Date", colX.date, y);
      doc.text("Qty", colX.qty, y);
      doc.text("Unit", colX.unit, y);
      doc.text("Unit price", colX.unitPrice, y);
      doc.text("VAT %", colX.vat, y);
      doc.text("Total", colX.total, y);
  
      y += 8;
  
      // Table rows
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      let subtotal = 0;
      let totalVAT = 0;
      
                   inv.items.forEach((item, index) => {
               if (y > pageHeight - 80) {
                 doc.addPage();
                 y = 20;

                 // Repeat header on new page
                 doc.setFontSize(11);
                 doc.setFont("helvetica", "bold");
                 doc.setFillColor(240, 240, 240);
                 doc.rect(10, y - 5, pageWidth - 20, 12, 'F');

                 doc.text("Row no.", colX.rowNo, y);
                 doc.text("Description", colX.description, y);
                 doc.text("Date", colX.date, y);
                 doc.text("Qty", colX.qty, y);
                 doc.text("Unit", colX.unit, y);
                 doc.text("Unit price", colX.unitPrice, y);
                 doc.text("VAT %", colX.vat, y);
                 doc.text("Total", colX.total, y);
                 y += 8;
                 doc.setFontSize(9);
                 doc.setFont("helvetica", "normal");
               }

               const itemTotal = item.amount || 0;
               const itemVAT = (itemTotal * (item.vatPercentage || 0)) / 100;
               // Calculate subtotal as the amount before VAT
               const itemSubtotal = itemTotal - itemVAT;
               subtotal += itemSubtotal;
               totalVAT += itemVAT;
  
                 doc.text(`${index + 1}`, colX.rowNo, y);
         doc.text(item.itemName || '', colX.description, y);
         doc.text(inv.date || '', colX.date, y);
         doc.text((item.quantity || 0).toString(), colX.qty, y);
         doc.text(item.unit || '', colX.unit, y);
         doc.text(`US$${(item.unitPrice || 0).toFixed(2)}`, colX.unitPrice, y);
         doc.text(`${(item.vatPercentage || 0).toFixed(2)}%`, colX.vat, y);
         doc.text(`US$${itemTotal.toFixed(2)}`, colX.total, y);
  
        y += 6;
      });
  
      // Summary Section (Right side) - Fixed layout
      const summaryX = pageWidth - 80;
      const summaryY = y + 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      doc.text("Subtotal:", summaryX, summaryY);
      doc.text("Total excl. VAT:", summaryX, summaryY + 8);
      doc.text("VAT Amount:", summaryX, summaryY + 16);
      doc.text("Total amount due:", summaryX, summaryY + 24);
      
      doc.setFont("helvetica", "normal");
      const finalTotal = inv.totalAmount || (subtotal + totalVAT);
      doc.text(`US$${subtotal.toFixed(2)}`, summaryX + 50, summaryY, { align: "right" });
      doc.text(`US$${subtotal.toFixed(2)}`, summaryX + 50, summaryY + 8, { align: "right" });
      doc.text(`US$${totalVAT.toFixed(2)}`, summaryX + 50, summaryY + 16, { align: "right" });
      doc.text(`US$${finalTotal.toFixed(2)}`, summaryX + 50, summaryY + 24, { align: "right" });
  
      // Footer
      const footerY = pageHeight - 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(companyProfile.name || 'Company Name', 15, footerY);
      doc.text(companyProfile.address || 'Company Address', 15, footerY + 6);
  
      // Save
      doc.save(`Invoice_${inv.userDefinedId}.pdf`);
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
      invoiceType: "Simple" as "Simple" | "Proforma",
      items: [{ itemName: "", description: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
      currency: "USD",
    })
    setEditingInvoice(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage invoices</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Invoice
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice ID, type, item name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:max-w-[32%] flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] hidden md:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {inv.userDefinedId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {inv.invoiceType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {inv.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(inv.currency)}{(inv.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {inv.currency}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base">
                        <ul className="list-disc list-inside">
                          {inv.items.map((item, index) => (
                            <li key={index}>
                              {item.itemName} - {item.description} (Qty: {item.quantity || 0} {item.unit}, {getCurrencySymbol(inv.currency)}{(item.unitPrice || 0).toFixed(2)}/unit, VAT: {item.vatPercentage || 0}%, Total: {getCurrencySymbol(inv.currency)}{(item.amount || 0).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(inv)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(inv)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(inv)}
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
                  No invoices found
                </div>
              ) : (
                currentItems.map((inv) => (
                  <div key={inv.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{inv.id}</p>
                        <p className="text-gray-500 text-sm">Type: {inv.invoiceType}</p>
                        <p className="text-gray-500 text-sm">Date: {inv.date}</p>
                        <p className="text-gray-500 text-sm">Total: {getCurrencySymbol(inv.currency)}{(inv.totalAmount || 0).toFixed(2)}</p>
                        <p className="text-gray-500 text-sm">Currency: {inv.currency}</p>
                        <ul className="list-disc list-inside text-gray-500 text-sm">
                          {inv.items.map((item, index) => (
                            <li key={index}>
                              {item.itemName} - {item.description} (Qty: {item.quantity || 0} {item.unit}, {getCurrencySymbol(inv.currency)}{(item.unitPrice || 0).toFixed(2)}/unit, VAT: {item.vatPercentage || 0}%, Total: {getCurrencySymbol(inv.currency)}{(item.amount || 0).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(inv)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(inv)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv)}
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
            totalItems={filteredInvoices.length}
          />
        )}

        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingInvoice ? "Edit Invoice" : "Add New Invoice"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="userDefinedId" className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice ID
                  </label>
                  <input
                    id="userDefinedId"
                    type="text"
                    value={formData.userDefinedId}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Auto-add INV- prefix if not present
                      if (value && !value.startsWith('INV-')) {
                        value = 'INV-' + value.replace(/^INV-/, '');
                      }
                      setFormData({ ...formData, userDefinedId: value });
                    }}
                    placeholder="Enter invoice ID (INV- will be added automatically)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="invoiceType" className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Type
                  </label>
                  <select
                    id="invoiceType"
                    value={formData.invoiceType}
                    onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value as "Simple" | "Proforma" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="Simple">Simple</option>
                    <option value="Proforma">Proforma</option>
                  </select>
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
                          <label htmlFor={`description-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            id={`description-${index}`}
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, "description", e.target.value)}
                            placeholder="Description"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
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
                            className="sm:max-w-[100%] flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                          />
                        </div>
                        <div>
                          <label htmlFor={`unit-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <select
                            id={`unit-${index}`}
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="" disabled>Unit</option>
                            <option value="meter">Meter</option>
                            <option value="yard">Yard</option>
                          </select>
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
                        <div>
                          <label htmlFor={`vatPercentage-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            VAT %
                          </label>
                          <input
                            id={`vatPercentage-${index}`}
                            type="number"
                            step="0.1"
                            value={item.vatPercentage}
                            onChange={(e) => handleItemChange(index, "vatPercentage", e.target.value)}
                            placeholder="VAT %"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                          <input
                            type="text"
                            value={`${getCurrencySymbol(formData.currency)}${item.amount}`}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm"
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
                    {editingInvoice ? "Update" : "Add"} Invoice
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
          onConfirm={() => deleteModal.invoice && handleDelete(deleteModal.invoice.id)}
          title="Delete Invoice"
          message="Are you sure you want to delete this invoice? This action cannot be undone."
          itemName={deleteModal.invoice?.id}
        />
      </div>
    </DashboardLayout>
  )
}