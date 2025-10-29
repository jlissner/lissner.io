'use client'

import { XMarkIcon, ShareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { deleteAlbum } from '../lib/api'
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
  onAlbumDeleted?: () => void
}

export const AlbumHeader = ({
  group,
  albumPhotos,
  onClose,
  onAddPhotos,
  onToggleSelection,
  selectionMode,
  isOperationInProgress,
  isUploading,
  onAlbumDeleted
}: AlbumHeaderProps) => {
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleDeleteAlbum = async () => {
    if (albumPhotos.length > 0) {
      toast.error('Cannot delete album that still contains photos. Please delete all photos first.')
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this album? This action cannot be undone.`
    )
    
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      await deleteAlbum(group.albumId)
      toast.success('Album deleted successfully')
      onClose() // Close the modal
      if (onAlbumDeleted) onAlbumDeleted() // Notify parent component
    } catch (error) {
      toast.error('Failed to delete album')
      console.error('Album deletion error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Check if current user can delete this album (owner or admin)
  const canDeleteAlbum = user && (user.email === group.uploadedBy || user.isAdmin)

  return (
    <header data-flex="between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--neutral-200)' }}>
      <div data-cluster="md">
        <div data-avatar className={getUserColor(group.uploadedBy)}>
          {getUserInitials(group.uploadedBy)}
        </div>
        <div>
          <h2>
            {group.albumName || `${getDisplayName(group.uploadedBy)}'s Album`}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)' }}>
            {albumPhotos.length < (group.estimatedTotalCount || albumPhotos.length)
              ? `${albumPhotos.length} of ${group.estimatedTotalCount || albumPhotos.length} photos`
              : `${group.estimatedTotalCount || albumPhotos.length} photos`
            } • By {getDisplayName(group.uploadedBy)} • {getRelativeTime(group.uploadedAt)}
          </p>
        </div>
      </div>
      <div data-cluster="md">
        <button
          onClick={handleShare}
            style={{ color: 'var(--neutral-400)' }}
          title="Share album"
        >
          <ShareIcon />
        </button>
        {canDeleteAlbum && albumPhotos.length === 0 && (
          <button
            onClick={handleDeleteAlbum}
            disabled={isDeleting || isOperationInProgress || isUploading}
            data-variant="danger"
            title="Delete empty album"
          >
            <TrashIcon />
          </button>
        )}
        <button
          onClick={onAddPhotos}
          disabled={isOperationInProgress || isUploading}
          className="btn btn-secondary"
        >
          Add Photos
        </button>
        <button
          onClick={onToggleSelection}
          disabled={isOperationInProgress || isUploading}
          data-variant={selectionMode ? 'danger' : 'secondary'}
        >
          {selectionMode ? '❌ Exit Selection' : '☑️ Select Photos'}
        </button>
        <button
          onClick={onClose}
          style={{ color: 'var(--neutral-400)' }}
        >
          <XMarkIcon />
        </button>
      </div>
    </header>
  )
}
