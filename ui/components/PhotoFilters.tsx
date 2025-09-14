'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { getUserColor, getUserInitials, getDisplayName } from './utils/photoUtils'

interface PhotoFiltersProps {
  allTags: string[]
  allUsers: string[]
  selectedTags: string[]
  selectedUsers: string[]
  totalPhotos: number
  filteredPhotos: number
  onToggleTag: (tag: string) => void
  onToggleUser: (user: string) => void
  onClearAllFilters: () => void
}

export const PhotoFilters = ({
  allTags,
  allUsers,
  selectedTags,
  selectedUsers,
  totalPhotos,
  filteredPhotos,
  onToggleTag,
  onToggleUser,
  onClearAllFilters
}: PhotoFiltersProps) => {
  const hasFilters = selectedTags.length > 0 || selectedUsers.length > 0

  return (
    <div className="w-64 flex-shrink-0 space-y-6">
      {/* Tag Filter Sidebar */}
      {allTags.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter by Tags</h3>
            {hasFilters && (
              <button
                onClick={onClearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all ({selectedTags.length + selectedUsers.length})
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={`inline-flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-primary-600 text-white border-2 border-primary-700 shadow-md'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <span>#{tag}</span>
                {selectedTags.includes(tag) && (
                  <XMarkIcon className="h-4 w-4 ml-2" />
                )}
              </button>
            ))}
          </div>
          
          {hasFilters && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredPhotos} of {totalPhotos} photos
              {selectedTags.length > 1 && ' (photos must have ALL selected tags)'}
              {selectedUsers.length > 0 && selectedTags.length > 0 && ' AND '}
              {selectedUsers.length > 0 && `from ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      )}
      
      {/* User Filter Sidebar */}
      {allUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter by Users</h3>
            {hasFilters && (
              <button
                onClick={onClearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all ({selectedTags.length + selectedUsers.length})
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            {allUsers.map((user) => (
              <button
                key={user}
                onClick={() => onToggleUser(user)}
                className={`inline-flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedUsers.includes(user)
                    ? 'bg-primary-600 text-white border-2 border-primary-700 shadow-md'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-5 h-5 rounded-full ${getUserColor(user)} flex items-center justify-center text-white text-xs font-medium`}>
                    {getUserInitials(user)}
                  </div>
                  <span>{getDisplayName(user)}</span>
                </div>
                {selectedUsers.includes(user) && (
                  <XMarkIcon className="h-4 w-4 ml-2" />
                )}
              </button>
            ))}
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredPhotos} of {totalPhotos} photos
            </div>
          )}
        </div>
      )}
    </div>
  )
} 