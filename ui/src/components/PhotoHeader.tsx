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
    <header data-flex="between" style={{ 
      padding: '1rem', 
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)' 
    }}>
      <h3 style={{ 
        fontWeight: 600, 
        color: 'rgba(255, 255, 255, 0.9)' 
      }}>
        Photo Details
      </h3>
      <div data-cluster="sm">
        <a
          href={photo.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            fontSize: '0.875rem', 
            color: 'var(--primary-400)', 
            fontWeight: 500,
            textDecoration: 'none'
          }}
        >
          View Original
        </a>
        <button
          onClick={handleShare}
          style={{ color: 'var(--primary-400)' }}
          title="Share photo"
        >
          <ShareIcon />
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            data-variant="danger"
            style={{ 
              color: isDeleting ? 'rgba(239, 68, 68, 0.5)' : 'var(--red-500)',
              cursor: isDeleting ? 'not-allowed' : 'pointer'
            }}
            title="Delete photo"
          >
            <TrashIcon />
          </button>
        )}
        <button
          onClick={onClose}
          data-close
          style={{ color: 'rgba(255, 255, 255, 0.6)' }}
        >
          <XMarkIcon />
        </button>
      </div>
    </header>
  )
} 