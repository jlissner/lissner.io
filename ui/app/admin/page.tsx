'use client'

import { useAuth } from '@/ui/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import FamilyMemberManager from '@/ui/components/admin/WhitelistManager'
import UserManager from '@/ui/components/admin/UserManager'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      router.push('/')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user || !user.isAdmin) {
    return null
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage users and site settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <FamilyMemberManager />
        <UserManager />
      </div>
    </div>
  )
} 