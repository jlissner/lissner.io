'use client'

import { XMarkIcon, ShareIcon } from '@heroicons/react/24/outline'
import { getUserColor, getUserInitials, getDisplayName, getRelativeTime } from './utils/photoUtils'
import { PhotoGroup, Photo } from './utils/photoUtils'
import toast from 'react-hot-toast'

interface AlbumHeaderProps {
  group: PhotoGroup
  albumPhotos: Photo[]
  onClose: () => void
  onAddPhotos: () => void
  onToggleSelection: () => void
  selectionMode: boolean
  isOperationInProgress: boolean
  isUploading: boolean
}

export const AlbumHeader = ({
  group,
  albumPhotos,
  onClose,
  onAddPhotos,
  onToggleSelection,
  selectionMode,
  isOperationInProgress,
  isUploading
}: AlbumHeaderProps) => {
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?album=${group.albumId}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Album link copied to clipboard!')
    } catch (error) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('Album link copied to clipboard!')
    }
  }

  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full ${getUserColor(group.uploadedBy)} flex items-center justify-center text-white text-lg font-medium`}>
          {getUserInitials(group.uploadedBy)}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {group.albumName || `${getDisplayName(group.uploadedBy)}'s Album`}
          </h2>
          <p className="text-sm text-gray-500">
            {albumPhotos.length < (group.estimatedTotalCount || albumPhotos.length)
              ? `${albumPhotos.length} of ${group.estimatedTotalCount || albumPhotos.length} photos`
              : `${group.estimatedTotalCount || albumPhotos.length} photos`
            } • By {getDisplayName(group.uploadedBy)} • {getRelativeTime(group.uploadedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={handleShare}
          className="text-gray-400 hover:text-gray-600"
          title="Share album"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
        <button
          onClick={onAddPhotos}
          disabled={isOperationInProgress || isUploading}
          className="px-3 py-1 rounded-lg text-sm font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Photos
        </button>
        <button
          onClick={onToggleSelection}
          disabled={isOperationInProgress || isUploading}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            isOperationInProgress || isUploading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : selectionMode
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {selectionMode ? '❌ Exit Selection' : '☑️ Select Photos'}
        </button>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
