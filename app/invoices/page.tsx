"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, Download } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"

interface InvoiceItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  vatPercentage: number
  amount: number
}

interface Invoice {
  id: string
  date: string
  items: InvoiceItem[]
  totalAmount: number
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    items: [{ description: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadInvoices()
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchTerm])

  const loadInvoices = () => {
    const savedInvoices = localStorage.getItem("invoices")
    if (savedInvoices) {
      const parsedInvoices = JSON.parse(savedInvoices)
      setInvoices(parsedInvoices)
    }
  }

  const saveInvoices = (newInvoices: Invoice[]) => {
    localStorage.setItem("invoices", JSON.stringify(newInvoices))
    setInvoices(newInvoices)
  }

  const filterInvoices = () => {
    if (!searchTerm) {
      setFilteredInvoices(invoices)
    } else {
      const filtered = invoices.filter(
        (inv) =>
          inv.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredInvoices(filtered)
    }
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.items.some(item => !item.description || !item.quantity || !item.unit || !item.unitPrice || !item.vatPercentage)) {
      showToast("Please fill in all required fields for all items", "error")
      return
    }

    const totalAmount = Number.parseFloat(calculateTotalAmount())
    const invId = editingInvoice ? editingInvoice.id : `INV-${Date.now().toString().slice(-6)}`

    const invoiceData: Invoice = {
      id: invId,
      date: formData.date,
      items: formData.items.map(item => ({
        description: item.description,
        quantity: Number.parseFloat(item.quantity),
        unit: item.unit,
        unitPrice: Number.parseFloat(item.unitPrice),
        vatPercentage: Number.parseFloat(item.vatPercentage),
        amount: Number.parseFloat(item.amount),
      })),
      totalAmount,
    }

    let newInvoices: Invoice[]
    if (editingInvoice) {
      newInvoices = invoices.map((inv) =>
        inv.id === editingInvoice.id ? invoiceData : inv
      )
      showToast("Invoice updated successfully!", "success")
    } else {
      newInvoices = [...invoices, invoiceData]
      showToast("Invoice added successfully!", "success")
    }

    saveInvoices(newInvoices)
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      date: invoice.date,
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: item.unitPrice.toString(),
        vatPercentage: item.vatPercentage.toString(),
        amount: item.amount.toString(),
      })),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      const newInvoices = invoices.filter((inv) => inv.id !== id)
      saveInvoices(newInvoices)
      showToast("Invoice deleted successfully!", "success")
    }
  }

  const handleDownloadPDF = (inv: Invoice) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
  
      // Logo (top-left corner)
      const imgData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="; // Replace with your actual logo
      doc.addImage(imgData, 'PNG', 10, 10, 30, 20); // (image, format, x, y, width, height)
  
      // Header - INVOICE title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", pageWidth / 2, 30, { align: "center" });
  
      // Invoice details
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice ID: ${inv.id}`, 10, 40);
      doc.text(`Date: ${inv.date}`, 10, 47);
  
      // Table headers
      let y = 60;
      doc.setFontSize(12);
      doc.setFont("courier", "bold");
  
      const colX = {
        index: 10,
        description: 25,
        quantity: 120,
        unitPrice: 140,
        vat: 160,
        amount: 180,
      };
  
      doc.text("No.", colX.index, y);
      doc.text("Description", colX.description, y);
      doc.text("Qty", colX.quantity, y, { align: "center" });
      doc.text("Price", colX.unitPrice, y, { align: "center" });
      doc.text("VAT%", colX.vat, y, { align: "center" });
      doc.text("Amount", colX.amount, y, { align: "center" });
  
      y += 6;
      doc.setLineWidth(0.2);
      doc.line(10, y, 200, y); // underline header
      y += 4;
  
      // Table rows
      doc.setFont("courier", "normal");
      inv.items.forEach((item, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
  
          // Repeat table header on new page
          doc.setFont("courier", "bold");
          doc.text("No.", colX.index, y);
          doc.text("Description", colX.description, y);
          doc.text("Qty", colX.quantity, y, { align: "center" });
          doc.text("Price", colX.unitPrice, y, { align: "center" });
          doc.text("VAT%", colX.vat, y, { align: "center" });
          doc.text("Amount", colX.amount, y, { align: "center" });
          y += 10;
          doc.setFont("courier", "normal");
        }
  
        doc.text(`${index + 1}`, colX.index, y);
        doc.text(item.description, colX.description, y);
        doc.text(item.quantity.toString(), colX.quantity, y, { align: "center" });
        doc.text(`$${item.unitPrice.toFixed(2)}`, colX.unitPrice, y, { align: "center" });
        doc.text(`${item.vatPercentage}%`, colX.vat, y, { align: "center" });
        doc.text(`$${item.amount.toFixed(2)}`, colX.amount, y, { align: "center" });
  
        y += 7;
      });
  
      // Total
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
  
      y += 3;
      doc.setLineWidth(0.2);
      doc.line(10, y, 200, y); // underline before total
      y += 10;
  
      doc.setFont("courier", "bold");
      doc.text("Total Amount:", 140, y);
      doc.text(`$${inv.totalAmount.toFixed(2)}`, 200, y, { align: "right" });
  
      // Save
      doc.save(`Invoice_${inv.id}.pdf`);
      showToast("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Failed to generate PDF. Please try again.", "error");
    }
  };
  
  

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      items: [{ description: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
    })
    setEditingInvoice(null)
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage invoices</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Invoice
          </button>
        </div>

        {/* Search and Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice ID..."
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
                    Invoice ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {inv.id}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {inv.date}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        ${inv.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-500 text-sm sm:text-base">
                        <ul className="list-disc list-inside">
                          {inv.items.map((item, index) => (
                            <li key={index}>
                              {item.description} (Qty: {item.quantity} {item.unit}, ${item.unitPrice.toFixed(2)}/unit, VAT: {item.vatPercentage}%, Total: ${item.amount.toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(inv)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
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
          </div>
        </div>

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 sm:px-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingInvoice ? "Edit Invoice" : "Add New Invoice"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items</label>
                  {formData.items.map((item, index) => (
                    <div key={index} className="border p-4 mb-2 rounded-md relative">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor={`description-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            id={`description-${index}`}
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, "description", e.target.value)}
                            placeholder="Enter description"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
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
                            placeholder="Enter quantity"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                          >
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
                            placeholder="Enter unit price"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
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
                            placeholder="Enter VAT %"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                          <input
                            type="text"
                            value={item.amount}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm sm:text-base"
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
                    value={calculateTotalAmount()}
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
                    {editingInvoice ? "Update" : "Add"} Invoice
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