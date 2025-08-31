"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Plus, Edit, Trash2, Building2 } from "lucide-react"
import { useToast } from "@/components/toast-provider"
import { companyProfileAPI } from "@/lib/api"
import { DeleteModal } from "@/components/ui/delete-modal"

interface CompanyProfile {
  id: string
  name: string
  contact: string
  email: string
  address: string
}

export default function CompanyProfilePage() {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; profile: CompanyProfile | null }>({
    isOpen: false,
    profile: null,
  })
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    address: "",
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadCompanyProfile()
  }, [])

  const loadCompanyProfile = async () => {
    try {
      setLoading(true)
      const data = await companyProfileAPI.get()
      if (data && Object.keys(data).length > 0) {
        setCompanyProfile(data)
      }
    } catch (error) {
      console.error("Error loading company profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.contact || !formData.email || !formData.address) {
      showToast("Please fill in all fields", "error")
      return
    }

    const profileData: CompanyProfile = {
      id: editingProfile ? editingProfile.id : `COMP-${Date.now().toString().slice(-6)}`,
      name: formData.name,
      contact: formData.contact,
      email: formData.email,
      address: formData.address,
    }

    try {
      if (editingProfile) {
        await companyProfileAPI.update(profileData)
        showToast("Company profile updated successfully!", "success")
      } else {
        await companyProfileAPI.create(profileData)
        showToast("Company profile created successfully!", "success")
      }
      
      await loadCompanyProfile()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      showToast("Failed to save company profile", "error")
      console.error("Error saving company profile:", error)
    }
  }

  const handleEdit = (profile: CompanyProfile) => {
    setEditingProfile(profile)
    setFormData({
      name: profile.name,
      contact: profile.contact,
      email: profile.email,
      address: profile.address,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await companyProfileAPI.delete(id)
      await loadCompanyProfile()
      showToast("Company profile deleted successfully!", "success")
    } catch (error) {
      showToast("Failed to delete company profile", "error")
      console.error("Error deleting company profile:", error)
    }
  }

  const openDeleteModal = (profile: CompanyProfile) => {
    setDeleteModal({ isOpen: true, profile })
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, profile: null })
  }

  const resetForm = () => {
    setFormData({ name: "", contact: "", email: "", address: "" })
    setEditingProfile(null)
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Company Profile</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your company information</p>
          </div>
          <button
            onClick={openAddDialog}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="mr-2 h-4 w-4" />
            {companyProfile ? "Edit Profile" : "Add Profile"}
          </button>
        </div>

        {/* Company Profile Display */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Company Information</h3>
          </div>
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading company profile...</p>
              </div>
            ) : companyProfile ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <p className="text-gray-900 text-sm sm:text-base">{companyProfile.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                      <p className="text-gray-900 text-sm sm:text-base">{companyProfile.contact}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900 text-sm sm:text-base">{companyProfile.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <p className="text-gray-900 text-sm sm:text-base">{companyProfile.address}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(companyProfile)}
                    className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => openDeleteModal(companyProfile)}
                    className="flex items-center px-3 py-2 text-red-600 hover:text-red-800 text-sm"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete Profile
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No company profile</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your company profile.</p>
                <div className="mt-6">
                  <button
                    onClick={openAddDialog}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Company Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex !mt-0 items-center justify-center z-50 px-4 sm:px-0">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">
                {editingProfile ? "Edit Company Profile" : "Add Company Profile"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter company name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <input
                    id="contact"
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Enter contact number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter company address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
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
                    {editingProfile ? "Update" : "Add"} Profile
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
          onConfirm={() => deleteModal.profile && handleDelete(deleteModal.profile.id)}
          title="Delete Company Profile"
          message="Are you sure you want to delete this company profile? This action cannot be undone."
          itemName={deleteModal.profile?.name}
        />
      </div>
    </DashboardLayout>
  )
} 