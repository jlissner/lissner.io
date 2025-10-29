'use client'

import { useState, useEffect } from 'react'
import { getUsers, updateUserAdmin } from '../../lib/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  isAdmin: boolean
  createdAt: string
  lastLogin?: string
}

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data.users)
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      await updateUserAdmin(userId, !currentIsAdmin)
      loadUsers()
      toast.success(
        currentIsAdmin 
          ? 'Admin privileges removed' 
          : 'Admin privileges granted'
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        User Management
      </h2>
      
      <p className="text-gray-600 text-sm mb-4">
        Manage admin privileges for registered users.
      </p>
      
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No users registered yet
          </p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {user.email}
                  {user.isAdmin && (
                    <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                  {user.lastLogin && (
                    <span className="ml-2">
                      • Last login {new Date(user.lastLogin).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                className={`px-3 py-1 text-sm font-medium rounded ${
                  user.isAdmin
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 