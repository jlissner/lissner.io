'use client'

import { useState, useEffect } from 'react'
import { getUsers, addFamilyMember, removeFamilyMember } from '../../lib/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  isAdmin: boolean
  createdAt: string
  lastLogin?: string
}

export default function FamilyMemberManager() {
  const [users, setUsers] = useState<User[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data.users)
    } catch (error) {
      toast.error('Failed to load family members')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return

    setIsAdding(true)
    try {
      await addFamilyMember(newEmail.trim(), newIsAdmin)
      setNewEmail('')
      setNewIsAdmin(false)
      loadUsers()
      toast.success('Family member added successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add family member')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveMember = async (user: User) => {
    if (!confirm(`Remove ${user.email} from the family?`)) return

    try {
      await removeFamilyMember(user.id)
      loadUsers()
      toast.success('Family member removed')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove family member')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Family Members
      </h2>
      
      <p className="text-gray-600 text-sm mb-4">
        Manage who can access the family photo website. Only users listed here can log in.
      </p>
      
      <form onSubmit={handleAddMember} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 input-field"
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-700">
              Admin
            </label>
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="btn-primary disabled:opacity-50 whitespace-nowrap"
          >
            {isAdding ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </form>
      
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No family members found
          </p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-medium">{user.email}</span>
                  {user.isAdmin && (
                    <span className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  <span>Joined {formatDate(user.createdAt)}</span>
                  {user.lastLogin && (
                    <span className="ml-4">Last login {formatDate(user.lastLogin)}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemoveMember(user)}
                className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 