"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout" // Ensure this path and export are correct
import { Plus, Edit, Trash2, Search, Download } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"

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
  supplier: string
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [formData, setFormData] = useState({
    supplier: "",
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

  const loadPurchaseOrders = () => {
    const savedPurchaseOrders = localStorage.getItem("purchaseOrders")
    if (savedPurchaseOrders) {
      const parsedPurchaseOrders = JSON.parse(savedPurchaseOrders)
      setPurchaseOrders(parsedPurchaseOrders)
    }
  }

  const loadProducts = () => {
    const savedProducts = localStorage.getItem("products")
    if (savedProducts) {
      const parsedProducts = JSON.parse(savedProducts)
      setProducts(parsedProducts)
    }
  }

  const savePurchaseOrders = (newPurchaseOrders: PurchaseOrder[]) => {
    localStorage.setItem("purchaseOrders", JSON.stringify(newPurchaseOrders))
    setPurchaseOrders(newPurchaseOrders)
  }

  const filterPurchaseOrders = () => {
    if (!searchTerm) {
      setFilteredPurchaseOrders(purchaseOrders)
    } else {
      const filtered = purchaseOrders.filter(
        (po) =>
          po.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier || !formData.currency || formData.items.some(item => !item.itemName || !item.quantity || !item.unitPrice)) {
      showToast("Please fill in all required fields for all items", "error")
      return
    }

    const totalAmount = Number.parseFloat(calculateTotalAmount())
    const poId = editingPurchaseOrder ? editingPurchaseOrder.id : `PO-${Date.now().toString().slice(-6)}`

    const purchaseOrderData: PurchaseOrder = {
      id: poId,
      supplier: formData.supplier,
      date: formData.date,
      items: formData.items.map(item => ({
        itemName: item.itemName,
        quantity: Number.parseFloat(item.quantity),
        unitPrice: Number.parseFloat(item.unitPrice),
        amount: Number.parseFloat(item.amount),
      })),
      totalAmount,
      currency: formData.currency,
    }

    let newPurchaseOrders: PurchaseOrder[]
    if (editingPurchaseOrder) {
      newPurchaseOrders = purchaseOrders.map((po) =>
        po.id === editingPurchaseOrder.id ? purchaseOrderData : po
      )
      showToast("Purchase order updated successfully!", "success")
    } else {
      newPurchaseOrders = [...purchaseOrders, purchaseOrderData]
      showToast("Purchase order added successfully!", "success")
    }

    savePurchaseOrders(newPurchaseOrders)
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (purchaseOrder: PurchaseOrder) => {
    setEditingPurchaseOrder(purchaseOrder)
    setFormData({
      supplier: purchaseOrder.supplier,
      date: purchaseOrder.date,
      items: purchaseOrder.items.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: item.amount.toString(),
      })),
      currency: purchaseOrder.currency,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      const newPurchaseOrders = purchaseOrders.filter((po) => po.id !== id)
      savePurchaseOrders(newPurchaseOrders)
      showToast("Purchase order deleted successfully!", "success")
    }
  }

  const handleDownloadPDF = (po: PurchaseOrder) => {
    try {
      const doc = new jsPDF();
      const imgData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const pageWidth = doc.internal.pageSize.getWidth();

      // Add logo
      doc.addImage(imgData, 'PNG', 10, 10, 30, 20);

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("PURCHASE ORDER", pageWidth / 2, 30, { align: 'center' });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Mehran Al Dahabi", pageWidth / 2, 40, { align: 'center' });

      doc.setFontSize(10);
      doc.text("CR#: 591644739", 10, 50);
      doc.text("businessemail@gmail.com", 10, 55);

      // Vendor Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("VENDOR", 10, 70);
      doc.setFont("helvetica", "normal");
      doc.text("Faisal Ahmed", 10, 78);
      doc.text("Jeddah, Saudi Arabia", 10, 85);

      // PO Details
      const rightX = pageWidth - 10;
      doc.text(`PO Number: ${po.id}`, rightX, 70, { align: 'right' });
      doc.text(`Date: ${po.date}`, rightX, 78, { align: 'right' });

      // Table Headers
      let y = 100;
      const colX = {
        itemName: 10,
        quantity: 100,
        unitPrice: 130,
        amount: 160,
      };

      doc.setFontSize(12);
      doc.setFont("courier", "bold");
      doc.text("Item Name", colX.itemName, y);
      doc.text("Qty", colX.quantity, y, { align: "center" });
      doc.text("Unit Price", colX.unitPrice, y, { align: "center" });
      doc.text("Amount", colX.amount, y, { align: "center" });

      y += 6;
      doc.setLineWidth(0.2);
      doc.line(10, y, 200, y); // table header underline
      y += 4;

      // Table Rows
      doc.setFont("courier", "normal");
      po.items.forEach((item, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(item.itemName, colX.itemName, y);
        doc.text(item.quantity.toString(), colX.quantity, y, { align: "center" });
        doc.text(`${getCurrencySymbol(po.currency)}${item.unitPrice.toFixed(2)}`, colX.unitPrice, y, { align: "center" });
        doc.text(`${getCurrencySymbol(po.currency)}${item.amount.toFixed(2)}`, colX.amount, y, { align: "center" });
        y += 7;
      });

      // Total
      y += 3;
      doc.setFont("courier", "bold");
      doc.line(10, y, 200, y); // underline before total
      y += 10;
      doc.text("Total", colX.unitPrice, y, { align: "center" });
      doc.text(`${getCurrencySymbol(po.currency)}${po.totalAmount.toFixed(2)}`, colX.amount, y, { align: "center" });

      doc.save(`Purchase_Order_${po.id}.pdf`);
      showToast("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Failed to generate PDF. Please try again.", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      supplier: "",
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
                placeholder="Search by purchase order ID, supplier, or currency..."
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
                    PO ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
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
                {filteredPurchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  filteredPurchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm sm:text-base">
                        {po.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {po.supplier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {po.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(po.currency)}{po.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {po.currency}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base">
                        <ul className="list-disc list-inside">
                          {po.items.map((item, index) => (
                            <li key={index}>
                              {item.itemName} (Qty: {item.quantity}, {getCurrencySymbol(po.currency)}{item.unitPrice.toFixed(2)}/unit, Total: {getCurrencySymbol(po.currency)}{item.amount.toFixed(2)})
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
                            onClick={() => handleDelete(po.id)}
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
              {filteredPurchaseOrders.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No purchase orders found
                </div>
              ) : (
                filteredPurchaseOrders.map((po) => (
                  <div key={po.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{po.id}</p>
                        <p className="text-gray-500 text-sm">Supplier: {po.supplier}</p>
                        <p className="text-gray-500 text-sm">Date: {po.date}</p>
                        <p className="text-gray-500 text-sm">Total: {getCurrencySymbol(po.currency)}{po.totalAmount.toFixed(2)}</p>
                        <p className="text-gray-500 text-sm">Currency: {po.currency}</p>
                        <ul className="list-disc list-inside text-gray-500 text-sm">
                          {po.items.map((item, index) => (
                            <li key={index}>
                              {item.itemName} (Qty: {item.quantity}, {getCurrencySymbol(po.currency)}{item.unitPrice.toFixed(2)}/unit, Total: {getCurrencySymbol(po.currency)}{item.amount.toFixed(2)})
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
                          onClick={() => handleDelete(po.id)}
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

        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingPurchaseOrder ? "Edit Purchase Order" : "Add New Purchase Order"}
              </h3>
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
                    placeholder="Supplier Name"
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
      </div>
    </DashboardLayout>
  )
}