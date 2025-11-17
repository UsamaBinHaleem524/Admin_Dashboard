"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, Download } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn, formatDisplayDate } from "@/lib/utils"
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
  quantity: number
  unit: string
  unitPrice: number
  vatPercentage: number
  amount: number
}

interface Invoice {
  id: string
  userDefinedId: string
  customer: string
  customerAddress?: string
  customerPhone?: string
  date: string
  invoiceType: "Simple" | "Proforma"
  items: InvoiceItem[]
  totalAmount: number
  currency: "USD" | "PKR" | "SAR" | "CNY"
  termsAndConditions?: string
  beneficiaryName?: string
  beneficiaryAddress?: string
  bankName?: string
  bankAddress?: string
  swiftBic?: string
  accountNumber?: string
  intermediaryBank?: string
  createdAt?: string
  updatedAt?: string
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
  const [showBankDetails, setShowBankDetails] = useState(false)
  const [formData, setFormData] = useState({
    userDefinedId: "",
    customer: "",
    customerAddress: "",
    customerPhone: "",
    date: new Date().toISOString().split('T')[0],
    invoiceType: "Simple" as "Simple" | "Proforma",
    items: [{ itemName: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
    currency: "USD" as "USD" | "PKR" | "SAR" | "CNY",
    termsAndConditions: "",
    beneficiaryName: "",
    beneficiaryAddress: "",
    bankName: "",
    bankAddress: "",
    swiftBic: "",
    accountNumber: "",
    intermediaryBank: "",
  })
  const { showToast } = useToast()

  // Normalize and sanitize text for PDF to avoid unsupported glyphs/controls
  const sanitizePdfText = (input: string | undefined | null): string => {
    if (!input) return ""
    try {
      let s = String(input)
        .normalize('NFKC')
        .replace(/[\u0000-\u001F\u007F\u0080-\u009F]/g, ' ') // remove control chars
        .replace(/\u000c/g, ' ') // explicit form feed to space
        .replace(/[\uFF0C，]/g, ', ') // full-width comma to ASCII comma+space
        .replace(/\s+/g, ' ') // collapse whitespace
      return s.trim()
    } catch {
      return String(input)
    }
  }

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
          inv.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inv.customerAddress && inv.customerAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (inv.customerPhone && inv.customerPhone.toLowerCase().includes(searchTerm.toLowerCase())) ||
          inv.invoiceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.items.some(item => 
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
      setFilteredInvoices(filtered)
    }
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemName: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
    })
  }

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalculate amount whenever quantity, unitPrice, or vatPercentage changes
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
      .reduce((sum, item) => {
        const quantity = Number.parseFloat(item.quantity || "0")
        const unitPrice = Number.parseFloat(item.unitPrice || "0")
        const vatPercentage = Number.parseFloat(item.vatPercentage || "0")
        const subtotal = quantity * unitPrice
        const vatAmount = subtotal * (vatPercentage / 100)
        return sum + subtotal + vatAmount
      }, 0)
      .toFixed(2)
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

  const calculateInvoiceTotal = (invoice: Invoice) => {
    // If totalAmount is 0 or missing, calculate it from items
    if (!invoice.totalAmount || invoice.totalAmount === 0) {
      return invoice.items.reduce((sum, item) => {
        const subtotal = (item.quantity || 0) * (item.unitPrice || 0)
        const vatAmount = subtotal * ((item.vatPercentage || 0) / 100)
        return sum + subtotal + vatAmount
      }, 0)
    }
    return invoice.totalAmount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.userDefinedId) {
      showToast("Please enter an Invoice ID", "error")
      return
    }

    if (!formData.customer) {
      showToast("Please enter a customer name", "error")
      return
    }

    if (formData.items.some(item => !item.itemName || !item.quantity || !item.unit || !item.unitPrice || !item.vatPercentage)) {
      showToast("Please fill in all required fields for all items", "error")
      return
    }

    if (!formData.invoiceType || !formData.currency) {
      showToast("Please select an invoice type and currency", "error")
      return
    }

    // Calculate total amount and ensure all item amounts are correct
    const calculatedItems = formData.items.map(item => {
      const quantity = Number.parseFloat(item.quantity)
      const unitPrice = Number.parseFloat(item.unitPrice)
      const vatPercentage = Number.parseFloat(item.vatPercentage)
      const subtotal = quantity * unitPrice
      const vatAmount = subtotal * (vatPercentage / 100)
      const amount = subtotal + vatAmount
      
      return {
        itemName: item.itemName,
        quantity,
        unit: item.unit,
        unitPrice,
        vatPercentage,
        amount,
      }
    })

    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.amount, 0)

    const invoiceData: Invoice = {
      id: editingInvoice ? editingInvoice.id : "",
      userDefinedId: formData.userDefinedId,
      customer: formData.customer,
      customerAddress: formData.customerAddress,
      customerPhone: formData.customerPhone,
      date: formData.date,
      invoiceType: formData.invoiceType,
      items: calculatedItems,
      totalAmount,
      currency: formData.currency,
      termsAndConditions: formData.termsAndConditions,
      beneficiaryName: formData.beneficiaryName,
      beneficiaryAddress: formData.beneficiaryAddress,
      bankName: formData.bankName,
      bankAddress: formData.bankAddress,
      swiftBic: formData.swiftBic,
      accountNumber: formData.accountNumber,
      intermediaryBank: formData.intermediaryBank,
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
    
    // Check if invoice has any bank details
    const hasBankDetails = !!(
      invoice.beneficiaryName || 
      invoice.beneficiaryAddress || 
      invoice.bankName || 
      invoice.bankAddress || 
      invoice.swiftBic || 
      invoice.accountNumber || 
      invoice.intermediaryBank
    )
    setShowBankDetails(hasBankDetails)
    
    setFormData({
      userDefinedId: invoice.userDefinedId,
      customer: invoice.customer,
      customerAddress: invoice.customerAddress || "",
      customerPhone: invoice.customerPhone || "",
      date: invoice.date,
      invoiceType: invoice.invoiceType,
      items: invoice.items.map(item => {
        // Recalculate amount to ensure it's correct
        const subtotal = item.quantity * item.unitPrice
        const vatAmount = subtotal * (item.vatPercentage / 100)
        const calculatedAmount = subtotal + vatAmount
        
        return {
          itemName: item.itemName,
          quantity: item.quantity.toString(),
          unit: item.unit,
          unitPrice: item.unitPrice.toString(),
          vatPercentage: item.vatPercentage.toString(),
          amount: calculatedAmount.toFixed(2),
        }
      }),
      currency: invoice.currency,
      termsAndConditions: invoice.termsAndConditions || "",
      beneficiaryName: invoice.beneficiaryName || "",
      beneficiaryAddress: invoice.beneficiaryAddress || "",
      bankName: invoice.bankName || "",
      bankAddress: invoice.bankAddress || "",
      swiftBic: invoice.swiftBic || "",
      accountNumber: invoice.accountNumber || "",
      intermediaryBank: invoice.intermediaryBank || "",
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
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(inv.userDefinedId || 'INVOICE', pageWidth - 25, 25, { align: "right" });

      // Invoice details (right side)
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice Date: ${formatDisplayDate(inv.date, "")}`, pageWidth - 25, 35, { align: "right" });
  
      // Sender Information (Left side - Company details)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(companyProfile.name || 'Company Name', 15, 60);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(companyProfile.contact || 'Contact Person', 15, 70);
      doc.text(companyProfile.address || 'Company Address', 15, 77);
      doc.text(companyProfile.email || 'Phone Number', 15, 84);

      // Customer Information (Right side) - with equal vertical spacing
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(inv.customer || 'Customer Name', pageWidth - 80, 66, { align: "left" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Add customer address if available with proper spacing
      if (inv.customerAddress) {
        const addressLines = doc.splitTextToSize(inv.customerAddress, 60); // 60 units width for wrapping
        doc.text(addressLines, pageWidth - 80, 72, { align: "left" });
      }
      
      // Add customer phone if available with proper spacing
      if (inv.customerPhone) {
        doc.text(inv.customerPhone, pageWidth - 80, 82, { align: "left" });
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
        unit: 125,
        unitPrice: 155,
        vat: 170,
        total: 195,
      };
  
      // Header row with background
      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - 8, pageWidth - 20, 10, 'F');
      
      doc.text("Row no.", colX.rowNo, y - 2);
      doc.text("Item Name", colX.description, y - 2);
      doc.text("Date", colX.date, y - 2);
      doc.text("Qty", colX.qty, y - 2, { align: "right" });
      doc.text("Unit", colX.unit, y - 2);
      doc.text("Unit price", colX.unitPrice, y - 2, { align: "right" });
      doc.text("VAT %", colX.vat, y - 2, { align: "right" });
      doc.text("Total", colX.total, y - 2, { align: "right" });
  
      y += 8;
  
      // Table rows
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      let subtotal = 0;
      let totalVAT = 0;
      
                   inv.items.forEach((item, index) => {
               if (y > pageHeight - 80) {
                 doc.addPage();
                 y = 20;

                 // Repeat header on new page
                 doc.setFontSize(10);
                 doc.setFont("helvetica", "bold");
                 doc.setFillColor(240, 240, 240);
                 doc.rect(10, y - 8, pageWidth - 20, 10, 'F');

                 doc.text("Row no.", colX.rowNo, y - 2);
                 doc.text("Item Name", colX.description, y - 2);
                 doc.text("Date", colX.date, y - 2);
                 doc.text("Qty", colX.qty, y - 2, { align: "right" });
                 doc.text("Unit", colX.unit, y - 2);
                 doc.text("Unit price", colX.unitPrice, y - 2, { align: "right" });
                 doc.text("VAT %", colX.vat, y - 2, { align: "right" });
                 doc.text("Total", colX.total, y - 2, { align: "right" });
                 y += 8;
                 doc.setFontSize(8);
                 doc.setFont("helvetica", "normal");
               }

               const itemTotal = item.amount || 0;
               const itemVAT = (itemTotal * (item.vatPercentage || 0)) / 100;
               // Calculate subtotal as the amount before VAT
               const itemSubtotal = itemTotal - itemVAT;
               subtotal += itemSubtotal;
               totalVAT += itemVAT;
  
                 doc.text(`${index + 1}`, colX.rowNo, y);
         
         // Handle item name with text wrapping
         const itemName = item.itemName || '';
         const maxItemNameWidth = colX.date - colX.description - 2; // Leave 2 units margin
         const itemNameLines = doc.splitTextToSize(itemName, maxItemNameWidth);
         
         // Draw the first line of item name
         doc.text(itemNameLines[0], colX.description, y);
         
         // Draw other columns on the first line
        doc.text(formatDisplayDate(inv.date, ''), colX.date, y);
         doc.text((item.quantity || 0).toString(), colX.qty, y, { align: "right" });
         doc.text(item.unit || '', colX.unit, y);
         doc.text(`US$${(item.unitPrice || 0).toFixed(2)}`, colX.unitPrice, y, { align: "right" });
         doc.text(`${(item.vatPercentage || 0).toFixed(2)}%`, colX.vat, y, { align: "right" });
         doc.text(`US$${itemTotal.toFixed(2)}`, colX.total, y, { align: "right" });
  
         // If item name has multiple lines, draw them on subsequent rows
         if (itemNameLines.length > 1) {
           for (let lineIndex = 1; lineIndex < itemNameLines.length; lineIndex++) {
             y += 6;
             
             // Check if we need a new page
             if (y > pageHeight - 80) {
               doc.addPage();
               y = 20;

               // Repeat header on new page
               doc.setFontSize(10);
               doc.setFont("helvetica", "bold");
               doc.setFillColor(240, 240, 240);
               doc.rect(10, y - 8, pageWidth - 20, 10, 'F');

               doc.text("Row no.", colX.rowNo, y - 2);
               doc.text("Item Name", colX.description, y - 2);
               doc.text("Date", colX.date, y - 2);
               doc.text("Qty", colX.qty, y - 2, { align: "right" });
               doc.text("Unit", colX.unit, y - 2);
               doc.text("Unit price", colX.unitPrice, y - 2, { align: "right" });
               doc.text("VAT %", colX.vat, y - 2, { align: "right" });
               doc.text("Total", colX.total, y - 2, { align: "right" });
               y += 8;
               doc.setFontSize(8);
               doc.setFont("helvetica", "normal");
             }
             
             doc.text(itemNameLines[lineIndex], colX.description, y);
           }
         }
  
        y += 6;
      });
  
      // Add horizontal line after items
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(10, y + 2, pageWidth - 10, y + 2);
  
      // Summary Section (Right side) - Compact layout with proper alignment
      const summaryY = y + 10;
      const summaryStartX = pageWidth - 45; // Start of summary section
      const labelX = summaryStartX; // Labels start here
      const valueX = pageWidth - 15; // Values end here (right margin)
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      // Labels aligned to the right within the summary section
      doc.text("Subtotal:", labelX, summaryY, { align: "right" });
      doc.text("Total excl. VAT:", labelX, summaryY + 8, { align: "right" });
      doc.text("VAT Amount:", labelX, summaryY + 16, { align: "right" });
      doc.text("Total amount due:", labelX, summaryY + 24, { align: "right" });
      
      // Values aligned to the right edge
      doc.setFont("helvetica", "normal");
      const finalTotal = calculateInvoiceTotal(inv);
      doc.text(`US$${subtotal.toFixed(2)}`, valueX, summaryY, { align: "right" });
      doc.text(`US$${subtotal.toFixed(2)}`, valueX, summaryY + 8, { align: "right" });
      doc.text(`US$${totalVAT.toFixed(2)}`, valueX, summaryY + 16, { align: "right" });
      doc.text(`US$${finalTotal.toFixed(2)}`, valueX, summaryY + 24, { align: "right" });

      // Terms and Conditions Section
      let currentY = summaryY + 35;
      if (inv.termsAndConditions) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("TERMS AND CONDITIONS:", 10, currentY);
        currentY += 8;
        doc.setFont("helvetica", "normal");
        const termsLines = doc.splitTextToSize(inv.termsAndConditions, pageWidth - 20);
        termsLines.forEach((line: string) => {
          doc.text(line, 10, currentY);
          currentY += 5;
        });
        currentY += 5;
      }

      // Bank Details Section
      if (inv.beneficiaryName || inv.bankName || inv.accountNumber || inv.swiftBic) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("BANK DETAILS:", 10, currentY);
        currentY += 8;
        doc.setFont("helvetica", "normal");
        
        if (inv.beneficiaryName) {
          // Label
          doc.setFont("helvetica", "bold");
          doc.text("BENEFICIARY'S NAME:", 10, currentY);
          // Value (wrapped)
          doc.setFont("helvetica", "normal");
          const valueLines = doc.splitTextToSize(inv.beneficiaryName, pageWidth - 20);
          currentY += 5;
          doc.text(valueLines, 10, currentY);
          currentY += valueLines.length * 5;
        }
        if (inv.beneficiaryAddress) {
          doc.setFont("helvetica", "bold");
          doc.text("BENEFICIARY'S ADDRESS:", 10, currentY);
          doc.setFont("helvetica", "normal");
          const valueLines = doc.splitTextToSize(inv.beneficiaryAddress, pageWidth - 20);
          currentY += 5;
          doc.text(valueLines, 10, currentY);
          currentY += valueLines.length * 5;
        }
        if (inv.bankName) {
          doc.setFont("helvetica", "bold");
          doc.text("BANK NAME:", 10, currentY);
          doc.setFont("helvetica", "normal");
          const valueLines = doc.splitTextToSize(inv.bankName, pageWidth - 20);
          currentY += 5;
          doc.text(valueLines, 10, currentY);
          currentY += valueLines.length * 5;
        }
        if (inv.bankAddress) {
          doc.setFont("helvetica", "bold");
          doc.text("BANK ADDRESS:", 10, currentY);
          doc.setFont("helvetica", "normal");
          const valueLines = doc.splitTextToSize(sanitizePdfText(inv.bankAddress), pageWidth - 20);
          currentY += 5;
          doc.text(valueLines, 10, currentY);
          currentY += valueLines.length * 5;
        }
        if (inv.swiftBic) {
          doc.setFont("helvetica", "bold");
          doc.text("SWIFT BIC:", 10, currentY);
          doc.setFont("helvetica", "normal");
          const valueLines = doc.splitTextToSize(inv.swiftBic, pageWidth - 20);
          currentY += 5;
          doc.text(valueLines, 10, currentY);
          currentY += valueLines.length * 5;
        }
        if (inv.accountNumber) {
          doc.setFont("helvetica", "bold");
          doc.text("USD ACCOUNT NUMBER:", 10, currentY);
          doc.setFont("helvetica", "normal");
          const valueLines = doc.splitTextToSize(inv.accountNumber, pageWidth - 20);
          currentY += 5;
          doc.text(valueLines, 10, currentY);
          currentY += valueLines.length * 5;
        }
        if (inv.intermediaryBank) {
          doc.setFont("helvetica", "bold");
          doc.text("INTERMEDIARY BANK (if you need):", 10, currentY);
          doc.setFont("helvetica", "normal");
          const valueLines = doc.splitTextToSize(inv.intermediaryBank, pageWidth - 20);
          currentY += 5;
          doc.text(valueLines, 10, currentY);
          currentY += valueLines.length * 5;
        }
        currentY += 5;
      }
  
      // Footer - Centered with proper styling
      const footerY = Math.max(pageHeight - 20, currentY + 10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(companyProfile.name || 'Company Name', pageWidth / 2, footerY, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.text(companyProfile.address || 'Company Address', pageWidth / 2, footerY + 6, { align: "center" });
  
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
      customer: "",
      customerAddress: "",
      customerPhone: "",
      date: new Date().toISOString().split('T')[0],
      invoiceType: "Simple" as "Simple" | "Proforma",
      items: [{ itemName: "", quantity: "", unit: "", unitPrice: "", vatPercentage: "", amount: "" }],
      currency: "USD",
      termsAndConditions: "",
      beneficiaryName: "",
      beneficiaryAddress: "",
      bankName: "",
      bankAddress: "",
      swiftBic: "",
      accountNumber: "",
      intermediaryBank: "",
    })
    setEditingInvoice(null)
    setShowBankDetails(false)
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
                placeholder="Search by invoice ID, customer, address, phone, type, item name"
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
                    Invoice ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                    Items & Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
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
                        {inv.customer}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base max-w-[200px]">
                        <div className="truncate" title={inv.customerAddress || "-"}>
                          {inv.customerAddress || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {inv.customerPhone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {inv.invoiceType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {formatDisplayDate(inv.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {getCurrencySymbol(inv.currency)}{calculateInvoiceTotal(inv).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm sm:text-base">
                        {inv.currency}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base min-w-[300px] max-w-[400px]">
                        <ul className="list-disc list-inside">
                          {inv.items.map((item, index) => (
                            <li key={index} className="mb-1">
                              <span className="font-medium">{item.itemName}</span><br />
                              <span className="text-xs text-gray-400">
                                Qty: {item.quantity || 0} {item.unit} | {getCurrencySymbol(inv.currency)}{(item.unitPrice || 0).toFixed(2)}/unit | VAT: {item.vatPercentage || 0}% | Total: {getCurrencySymbol(inv.currency)}{(item.amount || 0).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm sm:text-base max-w-[300px]">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {inv.beneficiaryName && (
                            <div><strong>Beneficiary:</strong> {inv.beneficiaryName}</div>
                          )}
                          {inv.bankName && (
                            <div><strong>Bank:</strong> {inv.bankName}</div>
                          )}
                          {inv.accountNumber && (
                            <div><strong>Account:</strong> {inv.accountNumber}</div>
                          )}
                          {inv.swiftBic && (
                            <div><strong>SWIFT:</strong> {inv.swiftBic}</div>
                          )}
                        </div>
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
                        <p className="font-medium text-gray-900 text-sm">{inv.userDefinedId}</p>
                        <p className="text-gray-500 text-sm">Customer: {inv.customer}</p>
                        <p className="text-gray-500 text-sm">Address: {inv.customerAddress || "-"}</p>
                        <p className="text-gray-500 text-sm">Phone: {inv.customerPhone || "-"}</p>
                        <p className="text-gray-500 text-sm">Type: {inv.invoiceType}</p>
                        <p className="text-gray-500 text-sm">Date: {formatDisplayDate(inv.date)}</p>
                        <p className="text-gray-500 text-sm">Total: {getCurrencySymbol(inv.currency)}{calculateInvoiceTotal(inv).toFixed(2)}</p>
                        <p className="text-gray-500 text-sm">Currency: {inv.currency}</p>
                        <ul className="list-disc list-inside text-gray-500 text-sm">
                          {inv.items.map((item, index) => (
                            <li key={index}>
                              {item.itemName} (Qty: {item.quantity || 0} {item.unit}, {getCurrencySymbol(inv.currency)}{(item.unitPrice || 0).toFixed(2)}/unit, VAT: {item.vatPercentage || 0}%, Total: {getCurrencySymbol(inv.currency)}{(item.amount || 0).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                        {(inv.beneficiaryName || inv.bankName || inv.accountNumber || inv.swiftBic) && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-gray-700 text-sm font-medium">Bank Details:</p>
                            {inv.beneficiaryName && (
                              <p className="text-gray-500 text-xs">Beneficiary: {inv.beneficiaryName}</p>
                            )}
                            {inv.bankName && (
                              <p className="text-gray-500 text-xs">Bank: {inv.bankName}</p>
                            )}
                            {inv.accountNumber && (
                              <p className="text-gray-500 text-xs">Account: {inv.accountNumber}</p>
                            )}
                            {inv.swiftBic && (
                              <p className="text-gray-500 text-xs">SWIFT: {inv.swiftBic}</p>
                            )}
                          </div>
                        )}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 !mt-0">
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
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <input
                    id="customer"
                    type="text"
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    placeholder="Customer Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Address
                  </label>
                  <textarea
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    placeholder="Enter customer address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Phone
                  </label>
                  <input
                    id="customerPhone"
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="Enter customer phone number"
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
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" | "CNY" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="USD">Dollar (USD)</option>
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                    <option value="CNY">Chinese Yuan (CNY)</option>
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
                
                {/* Terms and Conditions */}
                <div>
                  <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-700 mb-1">
                    Terms and Conditions
                  </label>
                  <textarea
                    id="termsAndConditions"
                    value={formData.termsAndConditions}
                    onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                    placeholder="Enter terms and conditions"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Bank Details Section */}
                <div className="col-span-full">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="showBankDetails"
                      checked={showBankDetails}
                      onChange={(e) => {
                        setShowBankDetails(e.target.checked)
                        // Clear bank details when checkbox is unchecked
                        if (!e.target.checked) {
                          setFormData({
                            ...formData,
                            beneficiaryName: "",
                            beneficiaryAddress: "",
                            bankName: "",
                            bankAddress: "",
                            swiftBic: "",
                            accountNumber: "",
                            intermediaryBank: "",
                          })
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showBankDetails" className="text-lg font-semibold text-gray-900 cursor-pointer">
                      Add Bank Details
                    </label>
                  </div>
                </div>
                
                {showBankDetails && (
                  <>
                    <div>
                      <label htmlFor="beneficiaryName" className="block text-sm font-medium text-gray-700 mb-1">
                        Beneficiary Name (Optional)
                      </label>
                      <input
                        id="beneficiaryName"
                        type="text"
                        value={formData.beneficiaryName}
                        onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                        placeholder="Enter beneficiary name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name (Optional)
                      </label>
                      <input
                        id="bankName"
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="Enter bank name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="swiftBic" className="block text-sm font-medium text-gray-700 mb-1">
                        SWIFT/BIC Code (Optional)
                      </label>
                      <input
                        id="swiftBic"
                        type="text"
                        value={formData.swiftBic}
                        onChange={(e) => setFormData({ ...formData, swiftBic: e.target.value })}
                        placeholder="Enter SWIFT/BIC code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number (Optional)
                      </label>
                      <input
                        id="accountNumber"
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        placeholder="Enter account number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div className="col-span-full">
                      <label htmlFor="beneficiaryAddress" className="block text-sm font-medium text-gray-700 mb-1">
                        Beneficiary Address (Optional)
                      </label>
                      <textarea
                        id="beneficiaryAddress"
                        value={formData.beneficiaryAddress}
                        onChange={(e) => setFormData({ ...formData, beneficiaryAddress: e.target.value })}
                        placeholder="Enter beneficiary address"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div className="col-span-full">
                      <label htmlFor="bankAddress" className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Address (Optional)
                      </label>
                      <textarea
                        id="bankAddress"
                        value={formData.bankAddress}
                        onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
                        placeholder="Enter bank address"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div className="col-span-full">
                      <label htmlFor="intermediaryBank" className="block text-sm font-medium text-gray-700 mb-1">
                        Intermediary Bank (Optional)
                      </label>
                      <input
                        id="intermediaryBank"
                        type="text"
                        value={formData.intermediaryBank}
                        onChange={(e) => setFormData({ ...formData, intermediaryBank: e.target.value })}
                        placeholder="Enter intermediary bank details if needed"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </>
                )}
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