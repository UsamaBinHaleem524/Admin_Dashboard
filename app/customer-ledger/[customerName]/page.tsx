"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Search, ArrowLeft, Calendar, Download } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { cn } from "@/lib/utils"
import { customerTransactionsAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"
import { Pagination } from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter, useParams } from "next/navigation"
import jsPDF from "jspdf"
import { getCompanyProfile, getDefaultCompanyProfile } from "@/lib/company-profile-utils"

interface CustomerTransaction {
  id: string
  customer: string
  description: string
  date: string
  currency: "USD" | "PKR" | "SAR"
  debit?: number
  credit?: number
  balance?: number
}

export default function CustomerDetailPage() {
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<CustomerTransaction[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<CustomerTransaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; transaction: CustomerTransaction | null }>({
    isOpen: false,
    transaction: null,
  })
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'PKR' | 'SAR'>("USD")
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [formData, setFormData] = useState({
    customer: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    currency: "USD" as "USD" | "PKR" | "SAR",
    debit: "",
    credit: "",
  })
  
  const router = useRouter()
  const params = useParams()
  const customerName = decodeURIComponent(params.customerName as string)
  const { showToast } = useToast()

  useEffect(() => {
    if (customerName) {
      loadTransactions()
      setFormData(prev => ({ ...prev, customer: customerName }))
    }
  }, [customerName])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm, selectedDate, selectedMonth, selectedYear])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedDate, selectedMonth, selectedYear])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const allTransactions = await customerTransactionsAPI.getAll()
      const customerTransactions = allTransactions.filter(
        (transaction: CustomerTransaction) => transaction.customer === customerName
      )
      setTransactions(customerTransactions)
    } catch (error) {
      showToast("Failed to load transactions", "error")
      console.error("Error loading transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = transactions

    // Apply date filter
    if (selectedDate) {
      filtered = filtered.filter(transaction => transaction.date === selectedDate)
    }

    // Apply month filter
    if (selectedMonth) {
      const currentYear = new Date().getFullYear()
      const monthStr = selectedMonth.padStart(2, '0')
      filtered = filtered.filter(transaction => 
        transaction.date.startsWith(`${currentYear}-${monthStr}`)
      )
    }

    // Apply year filter
    if (selectedYear) {
      filtered = filtered.filter(transaction => 
        transaction.date.startsWith(selectedYear)
      )
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (transaction) =>
          transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.date.includes(searchTerm) ||
          transaction.currency.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTransactions(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer || !formData.description || !formData.date || !formData.currency) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const debit = Number.parseFloat(formData.debit) || 0
    const credit = Number.parseFloat(formData.credit) || 0

    if (debit === 0 && credit === 0) {
      showToast("Please enter either a debit or credit amount", "error")
      return
    }

    try {
      if (editingTransaction) {
        await customerTransactionsAPI.update({
          ...editingTransaction,
          ...formData,
          debit,
          credit,
        })
        showToast("Transaction updated successfully", "success")
      } else {
        await customerTransactionsAPI.create({
          id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...formData,
          debit,
          credit,
        })
        showToast("Transaction added successfully", "success")
      }
      
      await loadTransactions()
      resetForm()
    } catch (error) {
      showToast("Failed to save transaction", "error")
      console.error("Error saving transaction:", error)
    }
  }

  const handleEdit = (transaction: CustomerTransaction) => {
    setEditingTransaction(transaction)
    setFormData({
      customer: transaction.customer,
      description: transaction.description,
      date: transaction.date,
      currency: transaction.currency,
      debit: (transaction.debit || 0).toString(),
      credit: (transaction.credit || 0).toString(),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (transaction: CustomerTransaction) => {
    try {
      await customerTransactionsAPI.delete(transaction.id)
      showToast("Transaction deleted successfully", "success")
      await loadTransactions()
    } catch (error) {
      showToast("Failed to delete transaction", "error")
      console.error("Error deleting transaction:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      customer: customerName,
      description: "",
      date: new Date().toISOString().split('T')[0],
      currency: "USD" as "USD" | "PKR" | "SAR",
      debit: "",
      credit: "",
    })
    setEditingTransaction(null)
    setIsDialogOpen(false)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      default: return ""
    }
  }

  const convertToDisplayCurrency = (amount: number, fromCurrency: 'USD' | 'PKR' | 'SAR') => {
    // Simple conversion rates (you might want to use real-time rates in production)
    const conversionRates = {
      USD: { USD: 1, PKR: 280, SAR: 3.75 },
      PKR: { USD: 0.0036, PKR: 1, SAR: 0.013 },
      SAR: { USD: 0.27, PKR: 75, SAR: 1 }
    }
    
    return amount * conversionRates[fromCurrency][displayCurrency]
  }

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredTransactions.slice(startIndex, endIndex)

  // Calculate summary
  const getTotalDebit = () => {
    return filteredTransactions.reduce((sum, t) => {
      return sum + convertToDisplayCurrency(t.debit || 0, t.currency)
    }, 0)
  }

  const getTotalCredit = () => {
    return filteredTransactions.reduce((sum, t) => {
      return sum + convertToDisplayCurrency(t.credit || 0, t.currency)
    }, 0)
  }

  const getCurrentBalance = () => {
    if (transactions.length === 0) return 0
    // Sort transactions by date to get the most recent one
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const lastTransaction = sortedTransactions[sortedTransactions.length - 1]
    return convertToDisplayCurrency(lastTransaction.balance || 0, lastTransaction.currency)
  }

  // Selection handling functions
  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    setSelectedTransactions(newSelected)
    setIsAllSelected(newSelected.size === filteredTransactions.length && filteredTransactions.length > 0)
  }

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTransactions(new Set())
      setIsAllSelected(false)
    } else {
      const allIds = new Set(filteredTransactions.map(t => t.id))
      setSelectedTransactions(allIds)
      setIsAllSelected(true)
    }
  }

  const handleExportSelected = async () => {
    if (selectedTransactions.size === 0) {
      showToast("Please select at least one transaction to export", "error")
      return
    }

    const transactionsToExport = filteredTransactions.filter(t => selectedTransactions.has(t.id))
    await generatePDF(transactionsToExport)
  }

  const generatePDF = async (transactionsToExport: CustomerTransaction[]) => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Get company profile data
      const companyProfile = await getCompanyProfile() || getDefaultCompanyProfile()

      // Logo (top-left corner)
      try {
        const logoResponse = await fetch('/logo.jpeg')
        const logoBlob = await logoResponse.blob()
        const logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(logoBlob)
        })
        doc.addImage(logoBase64 as string, 'JPEG', 15, 15, 35, 35)
      } catch (error) {
        // Fallback to placeholder if logo fails to load
        const imgData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        doc.addImage(imgData, 'PNG', 15, 15, 35, 35)
      }

      // Document Header
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("CUSTOMER TRANSACTIONS REPORT", pageWidth / 2, 30, { align: "center" })

      // Customer Information
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(`Customer: ${customerName}`, 15, 60)
      
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, 70)
      doc.text(`Total Transactions: ${transactionsToExport.length}`, 15, 80)

      // Company Information (right side)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text(companyProfile.name || 'Company Name', pageWidth - 15, 60, { align: "right" })
      
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(companyProfile.contact || 'Contact Person', pageWidth - 15, 70, { align: "right" })
      doc.text(companyProfile.address || 'Company Address', pageWidth - 15, 77, { align: "right" })
      doc.text(companyProfile.email || 'Phone Number', pageWidth - 15, 84, { align: "right" })

      // Table Section
      let yPosition = 100
      
      // Define column positions
      const colX = {
        date: 15,
        description: 45,
        currency: 120,
        debit: 150,
        credit: 170,
        balance: 190,
      }

      // Table headers with professional styling
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      
      // Header row with background
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPosition - 8, pageWidth - 20, 10, 'F')
      
      doc.text("Date", colX.date, yPosition - 2)
      doc.text("Description", colX.description, yPosition - 2)
      doc.text("Currency", colX.currency, yPosition - 2)
      doc.text("Debit", colX.debit, yPosition - 2, { align: "right" })
      doc.text("Credit", colX.credit, yPosition - 2, { align: "right" })
      doc.text("Balance", colX.balance, yPosition - 2, { align: "right" })

      yPosition += 8

      // Table content
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)

      let totalDebit = 0
      let totalCredit = 0
      let finalBalance = 0

      transactionsToExport.forEach((transaction, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 80) {
          doc.addPage()
          yPosition = 20

          // Repeat header on new page
          doc.setFontSize(10)
          doc.setFont("helvetica", "bold")
          doc.setFillColor(240, 240, 240)
          doc.rect(10, yPosition - 8, pageWidth - 20, 10, 'F')

          doc.text("Date", colX.date, yPosition - 2)
          doc.text("Description", colX.description, yPosition - 2)
          doc.text("Currency", colX.currency, yPosition - 2)
          doc.text("Debit", colX.debit, yPosition - 2, { align: "right" })
          doc.text("Credit", colX.credit, yPosition - 2, { align: "right" })
          doc.text("Balance", colX.balance, yPosition - 2, { align: "right" })
          yPosition += 8
          doc.setFontSize(9)
          doc.setFont("helvetica", "normal")
        }

        const debit = transaction.debit || 0
        const credit = transaction.credit || 0
        const balance = transaction.balance || 0

        totalDebit += debit
        totalCredit += credit
        finalBalance = balance // Last transaction's balance

        // Handle description with text wrapping
        const description = transaction.description || ''
        const maxDescriptionWidth = colX.currency - colX.description - 2
        const descriptionLines = doc.splitTextToSize(description, maxDescriptionWidth)
        
        // Draw the first line of description
        doc.text(descriptionLines[0], colX.description, yPosition)
        
        // Draw other columns on the first line
        doc.text(transaction.date, colX.date, yPosition)
        doc.text(transaction.currency, colX.currency, yPosition)
        doc.text(debit > 0 ? `${getCurrencySymbol(transaction.currency)}${debit.toFixed(2)}` : "-", colX.debit, yPosition, { align: "right" })
        doc.text(credit > 0 ? `${getCurrencySymbol(transaction.currency)}${credit.toFixed(2)}` : "-", colX.credit, yPosition, { align: "right" })
        doc.text(`${getCurrencySymbol(transaction.currency)}${balance.toFixed(2)}`, colX.balance, yPosition, { align: "right" })

        // If description has multiple lines, draw them on subsequent rows
        if (descriptionLines.length > 1) {
          for (let lineIndex = 1; lineIndex < descriptionLines.length; lineIndex++) {
            yPosition += 6
            
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
              doc.addPage()
              yPosition = 20

              // Repeat header on new page
              doc.setFontSize(10)
              doc.setFont("helvetica", "bold")
              doc.setFillColor(240, 240, 240)
              doc.rect(10, yPosition - 8, pageWidth - 20, 10, 'F')

              doc.text("Date", colX.date, yPosition - 2)
              doc.text("Description", colX.description, yPosition - 2)
              doc.text("Currency", colX.currency, yPosition - 2)
              doc.text("Debit", colX.debit, yPosition - 2, { align: "right" })
              doc.text("Credit", colX.credit, yPosition - 2, { align: "right" })
              doc.text("Balance", colX.balance, yPosition - 2, { align: "right" })
              yPosition += 8
              doc.setFontSize(9)
              doc.setFont("helvetica", "normal")
            }
            
            doc.text(descriptionLines[lineIndex], colX.description, yPosition)
          }
        }

        yPosition += 6
      })

      // Add horizontal line after transactions
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(10, yPosition + 2, pageWidth - 10, yPosition + 2)

      // Summary Section (Right side) - Compact layout with proper alignment
      const summaryY = yPosition + 10
      const summaryStartX = pageWidth - 45 // Start of summary section
      const labelX = summaryStartX // Labels start here
      const valueX = pageWidth - 15 // Values end here (right margin)
      
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      
      // Labels aligned to the right within the summary section
      doc.text("Total Debit:", labelX, summaryY, { align: "right" })
      doc.text("Total Credit:", labelX, summaryY + 8, { align: "right" })
      doc.text("Final Balance:", labelX, summaryY + 16, { align: "right" })
      
      // Values aligned to the right edge
      doc.setFont("helvetica", "normal")
      doc.text(`${getCurrencySymbol(displayCurrency)}${totalDebit.toFixed(2)}`, valueX, summaryY, { align: "right" })
      doc.text(`${getCurrencySymbol(displayCurrency)}${totalCredit.toFixed(2)}`, valueX, summaryY + 8, { align: "right" })
      doc.text(`${getCurrencySymbol(displayCurrency)}${finalBalance.toFixed(2)}`, valueX, summaryY + 16, { align: "right" })

      // Footer Section
      let currentY = summaryY + 35
      if (currentY < pageHeight - 30) {
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        
        // Add a note about the report
        currentY += 20
        doc.setFontSize(8)
        doc.setFont("helvetica", "italic")
      }

      // Footer - Centered with proper styling
      const footerY = Math.max(pageHeight - 20, currentY + 10)
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(companyProfile.name || 'Company Name', pageWidth / 2, footerY, { align: "center" })
      if (companyProfile.address) {
        doc.text(companyProfile.address || 'Company Address', pageWidth / 2, footerY + 6, { align: "center" })
      }

      // Save the PDF
      const fileName = `customer-transactions-${customerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      showToast("PDF exported successfully", "success")
    } catch (error) {
      showToast("Failed to export PDF", "error")
      console.error("Error generating PDF:", error)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading transactions...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-6">
            {/* Back Button */}
            <div className="flex justify-start">
              <button
                onClick={() => router.push('/customer-ledger')}
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Back to Customers</span>
              </button>
            </div>
            
            {/* Customer Info and Action Button */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-2xl">
                    {customerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 capitalize">
                    {customerName}
                  </h1>
                  <p className="text-base text-gray-500 mt-1">Customer Account</p>
                </div>
              </div>
              <button
                onClick={openAddDialog}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Transactions</h3>
                <p className="text-3xl font-bold text-gray-900">{transactions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">#</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Debit</h3>
                <p className="text-3xl font-bold text-red-600">{getCurrencySymbol(displayCurrency)}{getTotalDebit().toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">↓</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Credit</h3>
                <p className="text-3xl font-bold text-green-600">{getCurrencySymbol(displayCurrency)}{getTotalCredit().toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold text-lg">↑</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Current Balance</h3>
                <p className={cn(
                  "text-3xl font-bold",
                  getCurrentBalance() < 0 ? "text-red-800" : "text-green-800"
                )}>
                  {getCurrencySymbol(displayCurrency)}{getCurrentBalance().toFixed(2)}
                </p>
              </div>
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                getCurrentBalance() < 0 ? "bg-red-50" : "bg-green-50"
              )}>
                <span className={cn(
                  "font-bold text-lg",
                  getCurrentBalance() < 0 ? "text-red-600" : "text-green-600"
                )}>
                  {getCurrentBalance() < 0 ? "⚠" : "✓"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Currency Selector */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Display Currency</h3>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as 'USD' | 'PKR' | 'SAR')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="USD">USD - Dollar</option>
              <option value="PKR">PKR - Pakistani Rupee</option>
              <option value="SAR">SAR - Saudi Riyal</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            All totals will be converted and displayed in the selected currency
          </p>
        </div>

        {/* Bulk Actions */}
        {filteredTransactions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium text-gray-700">
                    Select All ({selectedTransactions.size} selected)
                  </label>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {selectedTransactions.size > 0 && (
                  <button
                    onClick={handleExportSelected}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected ({selectedTransactions.size})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex flex-col space-y-4">
              {/* Date Filters Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-700">Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate("")}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-700">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  {selectedMonth && (
                    <button
                      onClick={() => setSelectedMonth("")}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-700">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Years</option>
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                  {selectedYear && (
                    <button
                      onClick={() => setSelectedYear("")}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Search Row */}
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by description, date, or currency..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                    Select
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <span className="text-gray-400 text-2xl">📄</span>
                        </div>
                        <p className="text-gray-500 text-sm">No transactions found</p>
                        <p className="text-gray-400 text-xs mt-1">Add a transaction to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Checkbox
                          checked={selectedTransactions.has(transaction.id)}
                          onCheckedChange={() => handleSelectTransaction(transaction.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {transaction.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-red-600">
                          {(transaction.debit || 0) > 0 ? `${getCurrencySymbol(transaction.currency)}${(transaction.debit || 0).toFixed(2)}` : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          {(transaction.credit || 0) > 0 ? `${getCurrencySymbol(transaction.currency)}${(transaction.credit || 0).toFixed(2)}` : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={cn(
                          "text-sm font-semibold",
                          (transaction.balance || 0) < 0 ? "text-red-800" : "text-green-800"
                        )}>
                          {getCurrencySymbol(transaction.currency)}{(transaction.balance || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded-md hover:bg-blue-50"
                            title="Edit transaction"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, transaction })}
                            className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-md hover:bg-red-50"
                            title="Delete transaction"
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
          
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Transaction Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingTransaction ? "Update transaction details" : "Enter transaction information for " + customerName}
              </p>
            </div>
            <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-gray-50"
                  disabled={!editingTransaction}
                  required
                />
                {!editingTransaction && (
                  <p className="text-xs text-gray-500 mt-1">Customer name is fixed for this account</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Enter transaction description"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "PKR" | "SAR" })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  >
                    <option value="USD">USD</option>
                    <option value="PKR">PKR</option>
                    <option value="SAR">SAR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Debit Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.debit}
                    onChange={(e) => setFormData({ ...formData, debit: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Credit Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.credit}
                    onChange={(e) => setFormData({ ...formData, credit: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingTransaction ? "Update" : "Add"} Transaction
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, transaction: null })}
        onConfirm={() => {
          if (deleteModal.transaction) {
            handleDelete(deleteModal.transaction)
            setDeleteModal({ isOpen: false, transaction: null })
          }
        }}
        title="Delete Transaction"
        message={`Are you sure you want to delete this transaction? This action cannot be undone.`}
      />
    </DashboardLayout>
  )
}