'use client'

import { XMarkIcon, TrashIcon, ShareIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Photo {
  id: string
  originalUrl: string
  [key: string]: any
}

interface PhotoHeaderProps {
  photo: Photo
  canDelete: boolean
  isDeleting: boolean
  onClose: () => void
  onDelete: () => void
}

export const PhotoHeader = ({
  photo,
  canDelete,
  isDeleting,
  onClose,
  onDelete
}: PhotoHeaderProps) => {
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?photo=${photo.id}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Photo link copied to clipboard!')
    } catch (error) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('Photo link copied to clipboard!')
    }
  }
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h3 className="font-semibold text-gray-900">Photo Details</h3>
      <div className="flex items-center space-x-2">
        <a
          href={photo.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View Original
        </a>
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700 disabled:opacity-50"
            title="Delete photo"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
} 