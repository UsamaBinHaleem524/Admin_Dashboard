"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts"
import { DollarSign, Package, TrendingUp, Users } from "lucide-react"
import { salesAPI, purchasesAPI } from "@/lib/api"

interface Sale {
  id: string
  customer: string
  amount: number
  currency: string
  date: string
  khataId?: string
}

interface Purchase {
  id: string
  supplier: string
  amount: number
  currency: string
  date: string
  khataId?: string
}

interface DashboardStats {
  totalSales: Record<string, number>
  totalPurchases: Record<string, number>
  totalCustomers: number
  totalSuppliers: number
  monthlySalesData: any[]
  currencyDistribution: any[]
  netProfit: Record<string, number>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: { USD: 0, PKR: 0, SAR: 0, CNY: 0 },
    totalPurchases: { USD: 0, PKR: 0, SAR: 0, CNY: 0 },
    totalCustomers: 0,
    totalSuppliers: 0,
    monthlySalesData: [],
    currencyDistribution: [],
    netProfit: { USD: 0, PKR: 0, SAR: 0, CNY: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "PKR" | "SAR" | "CNY">("USD")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())

  useEffect(() => {
    loadDashboardData()
  }, [selectedYear])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [salesData, purchasesData] = await Promise.all([
        salesAPI.getAll(),
        purchasesAPI.getAll(),
      ])

      // Filter data by selected year
      const filteredSales = salesData.filter((sale: Sale) => {
        const saleYear = new Date(sale.date).getFullYear().toString()
        return saleYear === selectedYear
      })

      const filteredPurchases = purchasesData.filter((purchase: Purchase) => {
        const purchaseYear = new Date(purchase.date).getFullYear().toString()
        return purchaseYear === selectedYear
      })

      // Calculate total sales by currency
      const totalSales: Record<string, number> = { USD: 0, PKR: 0, SAR: 0, CNY: 0 }
      filteredSales.forEach((sale: Sale) => {
        totalSales[sale.currency] = (totalSales[sale.currency] || 0) + sale.amount
      })

      // Calculate total purchases by currency
      const totalPurchases: Record<string, number> = { USD: 0, PKR: 0, SAR: 0, CNY: 0 }
      filteredPurchases.forEach((purchase: Purchase) => {
        totalPurchases[purchase.currency] = (totalPurchases[purchase.currency] || 0) + purchase.amount
      })

      // Calculate net profit by currency
      const netProfit: Record<string, number> = { USD: 0, PKR: 0, SAR: 0, CNY: 0 }
      Object.keys(totalSales).forEach((currency) => {
        netProfit[currency] = totalSales[currency] - totalPurchases[currency]
      })

      // Get unique customers and suppliers
      const uniqueCustomers = new Set(filteredSales.map((s: Sale) => s.customer))
      const uniqueSuppliers = new Set(filteredPurchases.map((p: Purchase) => p.supplier))

      // Prepare monthly data for selected year
      const monthlySalesData = prepareMonthlyData(filteredSales, filteredPurchases, selectedYear)

      // Currency distribution for pie chart
      const currencyDistribution = [
        { name: "USD", value: totalSales.USD, color: "#3b82f6" },
        { name: "PKR", value: totalSales.PKR, color: "#10b981" },
        { name: "SAR", value: totalSales.SAR, color: "#f59e0b" },
        { name: "CNY", value: totalSales.CNY, color: "#ef4444" },
      ].filter((item) => item.value > 0)

      setStats({
        totalSales,
        totalPurchases,
        totalCustomers: uniqueCustomers.size,
        totalSuppliers: uniqueSuppliers.size,
        monthlySalesData,
        currencyDistribution,
        netProfit,
      })
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const prepareMonthlyData = (sales: Sale[], purchases: Purchase[], year: string) => {
    const monthlyData: Record<string, any> = {}
    const months = []
    
    // Get all 12 months of the selected year
    for (let i = 0; i < 12; i++) {
      const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
      const date = new Date(parseInt(year), i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
      
      monthlyData[monthKey] = {
        month: monthName,
        sales: 0,
        purchases: 0,
      }
      months.push(monthKey)
    }

    // Aggregate sales
    sales.forEach((sale: Sale) => {
      const saleDate = new Date(sale.date)
      const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].sales += sale.amount
      }
    })

    // Aggregate purchases
    purchases.forEach((purchase: Purchase) => {
      const purchaseDate = new Date(purchase.date)
      const monthKey = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].purchases += purchase.amount
      }
    })

    return months.map((key) => monthlyData[key])
  }

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "USD": return "$"
      case "PKR": return "₨"
      case "SAR": return "ر.س"
      case "CNY": return "¥"
      default: return ""
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-6 lg:px-0">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Business Overview</p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Year Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              >
                <option value="2020">2020</option>
                <option value="2021">2021</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Currency:</span>
              <div className="flex gap-2">
                {(["USD", "PKR", "SAR", "CNY"] as const).map((currency) => (
                  <button
                    key={currency}
                    onClick={() => setSelectedCurrency(currency)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedCurrency === currency
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Sales */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600">Total Sales</h3>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {getCurrencySymbol(selectedCurrency)}{stats.totalSales[selectedCurrency].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Total Purchases */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600">Total Purchases</h3>
              <Package className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {getCurrencySymbol(selectedCurrency)}{stats.totalPurchases[selectedCurrency].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Net Profit */}
          <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${stats.netProfit[selectedCurrency] >= 0 ? 'border-green-500' : 'border-orange-500'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600">Net Profit</h3>
              <TrendingUp className={`h-5 w-5 ${stats.netProfit[selectedCurrency] >= 0 ? 'text-green-500' : 'text-orange-500'}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {getCurrencySymbol(selectedCurrency)}{stats.netProfit[selectedCurrency].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Total Customers */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600">Total Customers</h3>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales vs Purchases Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales vs Purchases</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [
                    `${getCurrencySymbol(selectedCurrency)}${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    ''
                  ]}
                />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                <Bar dataKey="purchases" fill="#ef4444" name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sales Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [
                    `${getCurrencySymbol(selectedCurrency)}${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    'Sales'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* All Currencies Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary by Currency</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["USD", "PKR", "SAR", "CNY"] as const).map((currency) => (
              <div key={currency} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-600 mb-2">{currency}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sales:</span>
                    <span className="font-semibold text-blue-600">
                      {getCurrencySymbol(currency)}{stats.totalSales[currency].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Purchases:</span>
                    <span className="font-semibold text-red-600">
                      {getCurrencySymbol(currency)}{stats.totalPurchases[currency].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t">
                    <span className="text-gray-600">Profit:</span>
                    <span className={`font-bold ${stats.netProfit[currency] >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {getCurrencySymbol(currency)}{stats.netProfit[currency].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
