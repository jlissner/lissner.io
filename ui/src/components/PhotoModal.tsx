'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../lib/auth-context'
import { usePhotoNavigation } from './hooks/usePhotoNavigation'
import { usePhotoActions } from './hooks/usePhotoActions'
import { PhotoViewer } from './PhotoViewer'
import { PhotoHeader } from './PhotoHeader'
import { PhotoSidebar } from './PhotoSidebar'
import { PhotoDetails } from './PhotoDetails'
import { PhotoTags } from './PhotoTags'
import { PhotoComments } from './PhotoComments'
import { EmojiPicker } from './EmojiPicker'
import { Photo } from '../types/photo'

interface PhotoModalProps {
  photo: Photo
  onClose: () => void
  onUpdate: () => void
  onDelete?: () => void
  // Album navigation props
  albumPhotos?: Photo[]
  albumHasMore?: boolean
  albumLoadingMore?: boolean
  estimatedTotalPhotos?: number
  onNavigateToPhoto?: (photo: Photo) => void
  onLoadMorePhotos?: () => Promise<void>
}

export default function PhotoModal({
  photo,
  onClose,
  onUpdate,
  onDelete,
  albumPhotos,
  albumHasMore,
  albumLoadingMore,
  estimatedTotalPhotos,
  onNavigateToPhoto,
  onLoadMorePhotos
}: PhotoModalProps) {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as Element
        if (!target.closest('.emoji-picker-container')) {
          setShowEmojiPicker(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  // Custom hooks - MUST be called on every render
  const navigation = usePhotoNavigation({
    photo,
    albumPhotos,
    albumHasMore,
    albumLoadingMore,
    estimatedTotalPhotos,
    onNavigateToPhoto,
    onLoadMorePhotos,
    onClose
  })

  const actions = usePhotoActions({
    photo,
    userEmail: user?.email,
    isAdmin: user?.isAdmin || false,
    onUpdate,
    onDelete
  })

  // Disable keyboard navigation while image is loading
  useEffect(() => {
    if (imageLoading) {
      // Temporarily override keyboard navigation
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          e.stopPropagation()
        }
      }
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [imageLoading])

  // Don't render on server or before mounting - AFTER all hooks
  if (!mounted) return null

  const modalContent = (
    <dialog 
      open 
      data-variant="photo"
      style={{ 
        position: 'fixed',
        inset: 0,
        maxWidth: '80rem',
        width: '100%',
        maxHeight: '95vh',
        margin: 'auto',
        padding: 0,
        border: 'none',
        backgroundColor: 'transparent'
      }}
      onClick={(e) => {
        // Close modal if clicking on the backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        style={{ 
          background: 'rgba(30, 30, 30, 0.98)',
          borderRadius: '0.75rem',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header - Always at top on mobile */}
        <div style={{ display: 'block' }} data-mobile="show" data-desktop="hide">
          <PhotoHeader
            photo={photo}
            canDelete={actions.canDelete}
            isDeleting={actions.isDeleting}
            onClose={onClose}
            onDelete={actions.handleDelete}
          />
        </div>

        {/* Main Content - Responsive Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }} data-responsive="photo-modal">
          {/* Image Section */}
          <div style={{ flex: 1 }}>
            <PhotoViewer
              photo={photo}
              canNavigatePrevious={navigation.canNavigatePrevious && !imageLoading}
              canNavigateNext={navigation.canNavigateNext && !imageLoading}
              currentIndex={navigation.currentIndex}
              totalPhotos={navigation.totalPhotos}
              onNavigatePrevious={navigation.navigateToPrevious}
              onNavigateNext={navigation.navigateToNext}
              onImageLoadingChange={setImageLoading}
            />
          </div>
          
          {/* Details Section - Desktop only (header moved to top on mobile) */}
          <aside style={{ 
            width: '100%', 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', 
            flexDirection: 'column' 
          }} data-responsive="modal-sidebar">
            {/* Header - Desktop only */}
            <div data-mobile="hide" data-desktop="show">
              <PhotoHeader
                photo={photo}
                canDelete={actions.canDelete}
                isDeleting={actions.isDeleting}
                onClose={onClose}
                onDelete={actions.handleDelete}
              />
            </div>
          
          {/* Mobile Reactions - Always visible */}
          <div data-mobile="show" data-desktop="hide" style={{ 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
            background: 'rgba(40, 40, 40, 0.9)', 
            padding: '1rem' 
          }}>
            <div data-cluster="sm" style={{ flexWrap: 'wrap' }}>
              {/* Show existing reactions grouped by emoji */}
              {Object.entries(
                actions.localReactions.reduce((acc, reaction) => {
                  acc[reaction.type] = (acc[reaction.type] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([emoji, count]) => {
                const isUserReaction = actions.userReactions.some(r => r.type === emoji)
                return (
                  <button
                    key={emoji}
                    onClick={() => actions.handleReaction(emoji)}
                    data-variant={isUserReaction ? 'primary' : 'secondary'}
                    data-size="sm"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.25rem',
                      background: isUserReaction ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: isUserReaction ? 'var(--primary-400)' : 'rgba(255, 255, 255, 0.8)',
                      border: `1px solid ${isUserReaction ? 'var(--primary-400)' : 'rgba(255, 255, 255, 0.2)'}`,
                      borderRadius: '1rem'
                    }}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                )
              })}
              
              {/* Add reaction button */}
              <div className="relative emoji-picker-container">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  data-variant="secondary"
                  data-size="sm"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '1rem'
                  }}
                  title="Add reaction"
                >
                  <span>😊</span>
                  <span>+</span>
                </button>
                
                {/* Emoji Picker - Positioned absolutely to not affect layout */}
                {showEmojiPicker && (
                  <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '0.5rem', zIndex: 50 }}>
                    <EmojiPicker
                      onEmojiSelect={(emoji) => actions.handleReaction(emoji)}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Accordion for Other Details */}
          <div data-mobile="show" data-desktop="hide">
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '1rem', 
                background: 'rgba(50, 50, 50, 0.9)', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <div data-cluster="sm">
                <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                  Tags & Comments
                </span>
                {(actions.localComments.length > 0 || actions.localTags.length > 0) && (
                  <span style={{ 
                    background: 'rgba(59, 130, 246, 0.2)', 
                    color: 'var(--primary-400)', 
                    fontSize: '0.75rem', 
                    fontWeight: 500, 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem' 
                  }}>
                    {actions.localComments.length + actions.localTags.length}
                  </span>
                )}
              </div>
              <svg
                style={{ 
                  width: '1.25rem', 
                  height: '1.25rem', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  transform: detailsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Mobile Accordion Content - Tags and Comments only */}
            {detailsExpanded && (
              <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
                <div data-stack="lg" style={{ padding: '1rem' }}>
                  {/* Photo Details */}
                  <div>
                    <h4 style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '0.5rem' }}>
                      Photo Info
                    </h4>
                    <PhotoDetails photo={photo} />
                  </div>
                  
                  {/* Tags */}
                  <PhotoTags
                    tags={actions.localTags}
                    newTag={actions.newTag}
                    isLoading={actions.isLoading}
                    onAddTag={actions.handleAddTag}
                    onRemoveTag={actions.handleRemoveTag}
                    onTagChange={actions.setNewTag}
                  />
                  
                  {/* Comments */}
                  <PhotoComments
                    comments={actions.localComments}
                    newComment={actions.newComment}
                    isLoading={actions.isLoading}
                    onNewCommentChange={actions.setNewComment}
                    onAddComment={actions.handleAddComment}
                    onDeleteComment={actions.handleDeleteComment}
                  />
                </div>
              </div>
            )}
          </div>

            {/* Desktop Sidebar */}
            <div data-mobile="hide" data-desktop="show" style={{ flex: 1, overflowY: 'auto' }}>
              <PhotoSidebar
                photo={photo}
                localTags={actions.localTags}
                localComments={actions.localComments}
                localReactions={actions.localReactions}
                userReactions={actions.userReactions}
                newComment={actions.newComment}
                newTag={actions.newTag}
                isLoading={actions.isLoading}
                handleReaction={actions.handleReaction}
                handleAddTag={actions.handleAddTag}
                handleRemoveTag={actions.handleRemoveTag}
                handleAddComment={actions.handleAddComment}
                handleDeleteComment={actions.handleDeleteComment}
                setNewComment={actions.setNewComment}
                setNewTag={actions.setNewTag}
              />
            </div>
          </aside>
        </div>
      </div>
    </dialog>
  )

  // Render modal using portal to document.body
  return createPortal(modalContent, document.body)
} 