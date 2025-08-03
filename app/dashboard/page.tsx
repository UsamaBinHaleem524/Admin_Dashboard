"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react"

const salesData = [
  { month: "Jan", sales: 4000, purchases: 2400 },
  { month: "Feb", sales: 3000, purchases: 1398 },
  { month: "Mar", sales: 2000, purchases: 9800 },
  { month: "Apr", sales: 2780, purchases: 3908 },
  { month: "May", sales: 1890, purchases: 4800 },
  { month: "Jun", sales: 2390, purchases: 3800 },
]

const recentActivity = [
  { id: 1, type: "Sale", customer: "John Doe", amount: 1250, date: "2024-01-15" },
  { id: 2, type: "Purchase", supplier: "ABC Corp", amount: 850, date: "2024-01-14" },
  { id: 3, type: "Sale", customer: "Jane Smith", amount: 2100, date: "2024-01-13" },
  { id: 4, type: "Purchase", supplier: "XYZ Ltd", amount: 1500, date: "2024-01-12" },
]

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to your admin dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">$45,231.89</div>
            <p className="text-xs text-gray-500">+20.1% from last month</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Purchases</h3>
              <Package className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">$23,456.78</div>
            <p className="text-xs text-gray-500">+15.3% from last month</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Active Customers</h3>
              <ShoppingCart className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">2,350</div>
            <p className="text-xs text-gray-500">+180 new this month</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Growth Rate</h3>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">+12.5%</div>
            <p className="text-xs text-gray-500">+2.1% from last month</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sales vs Purchases</h3>
              <p className="text-sm text-gray-500">Monthly comparison of sales and purchases</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#3b82f6" />
                <Bar dataKey="purchases" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
              <p className="text-sm text-gray-500">Monthly sales performance</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-500">Latest transactions and activities</p>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-2 h-2 rounded-full ${activity.type === "Sale" ? "bg-green-500" : "bg-blue-500"}`}
                  ></div>
                  <div>
                    <p className="font-medium">{activity.type}</p>
                    <p className="text-sm text-gray-600">
                      {activity.type === "Sale" ? activity.customer : activity.supplier}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${activity.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
