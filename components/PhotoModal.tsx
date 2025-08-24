'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/lib/auth-context'
import { usePhotoNavigation } from './hooks/usePhotoNavigation'
import { usePhotoActions } from './hooks/usePhotoActions'
import { PhotoViewer } from './PhotoViewer'
import { PhotoHeader } from './PhotoHeader'
import { PhotoSidebar } from './PhotoSidebar'
import { PhotoDetails } from './PhotoDetails'
import { PhotoTags } from './PhotoTags'
import { PhotoComments } from './PhotoComments'
import { EmojiPicker } from './EmojiPicker'
import { Photo } from './types/photo'

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
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-2 sm:p-4" 
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        // Close modal if clicking on the backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header - Always at top on mobile */}
        <div className="lg:hidden">
          <PhotoHeader
            photo={photo}
            canDelete={actions.canDelete}
            isDeleting={actions.isDeleting}
            onClose={onClose}
            onDelete={actions.handleDelete}
          />
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="flex flex-col lg:flex-row flex-1">
          {/* Image Section */}
          <div className="flex-1">
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
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col">
            {/* Header - Desktop only */}
            <div className="hidden lg:block">
              <PhotoHeader
                photo={photo}
                canDelete={actions.canDelete}
                isDeleting={actions.isDeleting}
                onClose={onClose}
                onDelete={actions.handleDelete}
              />
            </div>
          
          {/* Mobile Reactions - Always visible */}
          <div className="lg:hidden border-b border-gray-200 bg-white p-4">
            <div className="flex items-center space-x-2 flex-wrap">
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
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                      isUserReaction
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'hover:bg-gray-200 text-gray-600 border border-gray-200'
                    }`}
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
                  className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors hover:bg-gray-200 text-gray-600 border border-gray-200"
                  title="Add reaction"
                >
                  <span>😊</span>
                  <span>+</span>
                </button>
                
                {/* Emoji Picker - Positioned absolutely to not affect layout */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
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
          <div className="lg:hidden">
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg font-medium text-gray-900">Tags & Comments</span>
                {(actions.localComments.length > 0 || actions.localTags.length > 0) && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {actions.localComments.length + actions.localTags.length}
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Mobile Accordion Content - Tags and Comments only */}
            {detailsExpanded && (
              <div className="max-h-80 overflow-y-auto">
                <div className="p-4 space-y-6">
                  {/* Photo Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Photo Info</h4>
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
                    onAddComment={actions.handleAddComment}
                    onCommentChange={actions.setNewComment}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block flex-1 overflow-y-auto">
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
              setNewComment={actions.setNewComment}
              setNewTag={actions.setNewTag}
            />
          </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Render modal using portal to document.body
  return createPortal(modalContent, document.body)
} 