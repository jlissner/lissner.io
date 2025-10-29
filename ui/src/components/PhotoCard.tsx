import { useState } from 'react'
import { Photo } from './utils/photoUtils'
import { getUserColor, getUserInitials, getDisplayName, getRelativeTime } from './utils/photoUtils'

interface PhotoCardProps {
  photo: Photo
  selectionMode: boolean
  selectedPhotos: Set<string>
  selectedTags: string[]
  expandedComments: Set<string>
  onPhotoClick: () => void
  onSelectionToggle: (photoId: string) => void
  onCommentToggle: (photoId: string, event: React.MouseEvent) => void
}

export const PhotoCard = ({
  photo,
  selectionMode,
  selectedPhotos,
  selectedTags,
  expandedComments,
  onPhotoClick,
  onSelectionToggle,
  onCommentToggle,
  priority = false
}: PhotoCardProps & { priority?: boolean }) => {
  return (
    <article
      style={{ cursor: 'pointer' }}
      onClick={onPhotoClick}
    >
      {/* User Info Header */}
      <header data-flex="between" style={{ padding: '0.75rem', borderBottom: '1px solid var(--neutral-100)' }}>
        <div data-cluster="md">
          <div data-avatar="sm" className={getUserColor(photo.uploadedBy)}>
            {getUserInitials(photo.uploadedBy)}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--neutral-900)' }}>
              {getDisplayName(photo.uploadedBy)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
              {getRelativeTime(photo.uploadedAt)}
            </div>
          </div>
        </div>
        {photo.location && (
          <a
            href={`https://maps.google.com/?q=${photo.location.latitude},${photo.location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--neutral-400)' }}
            title={`Location: ${photo.location.latitude.toFixed(3)}, ${photo.location.longitude.toFixed(3)} (Click to view in Google Maps)`}
            onClick={(e) => e.stopPropagation()}
          >
            📍
          </a>
        )}
      </header>
      
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src={photo.thumbnailUrl || photo.url}
          alt={photo.caption || 'Family photo'}
          style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
        />
        
        {/* Selection Checkbox */}
        {selectionMode && (
          <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 10 }}>
            <input
              type="checkbox"
              checked={selectedPhotos.has(photo.id)}
              onChange={(e) => {
                e.stopPropagation()
                onSelectionToggle(photo.id)
              }}
              style={{ width: '1.25rem', height: '1.25rem' }}
            />
          </div>
        )}
      </div>
      
      <div style={{ padding: '1rem' }}>
        {photo.caption && (
          <p style={{ color: 'var(--neutral-800)', fontWeight: 500, marginBottom: '0.75rem' }}>{photo.caption}</p>
        )}
        
        {/* Photo metadata */}
        <div data-flex="between" style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '0.75rem' }}>
          <div data-cluster="md">
            {photo.takenAt && (
              <span className="flex items-center space-x-1">
                <span>📸</span>
                <span>{new Date(photo.takenAt).toLocaleDateString()}</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <span>📤</span>
              <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center mt-2 space-x-4">
          <div className="flex items-center space-x-1">
            {(() => {
              // Group reactions by emoji type
              const reactionCounts = photo.reactions.reduce((acc, reaction) => {
                acc[reaction.type] = (acc[reaction.type] || 0) + 1
                return acc
              }, {} as Record<string, number>)
              
              const entries = Object.entries(reactionCounts)
              
              if (entries.length === 0) {
                return (
                  <>
                    <span>👍</span>
                    <span className="text-sm text-gray-600">0</span>
                  </>
                )
              }
              
              // Show up to 2 different emoji types for individual photos
              const maxShow = 2
              const shown = entries.slice(0, maxShow)
              const remaining = entries.slice(maxShow)
              const totalRemaining = remaining.reduce((acc, [, count]) => acc + count, 0)
              
              return (
                <>
                  {shown.map(([emoji, count], index) => (
                    <span key={emoji} className="flex items-center space-x-1">
                      <span>{emoji}</span>
                      <span className="text-sm text-gray-600">{count}</span>
                      {index < shown.length - 1 && totalRemaining === 0 && <span className="text-gray-400">•</span>}
                    </span>
                  ))}
                  {totalRemaining > 0 && (
                    <span className="text-gray-500 text-xs">
                      +{totalRemaining}
                    </span>
                  )}
                </>
              )
            })()}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCommentToggle(photo.id, e)
            }}
            className={`flex items-center space-x-1 hover:bg-gray-100 rounded px-2 py-1 transition-colors ${
              expandedComments.has(photo.id) ? 'bg-gray-100' : ''
            }`}
          >
            <span>💬</span>
            <span className="text-sm text-gray-600">
              {photo.comments.length}
            </span>
            {expandedComments.has(photo.id) && (
              <span className="text-xs text-gray-400">
                ▼
              </span>
            )}
          </button>
        </div>
        
        {photo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {photo.tags.map((tag, index) => (
              <span
                key={index}
                className={`px-2 py-1 text-xs rounded-full ${
                  selectedTags.includes(tag)
                    ? 'bg-primary-600 text-white font-medium'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Expandable Comments Section - only in single column mode */}
        {expandedComments.has(photo.id) && (
          <div 
            className="mt-4 pt-4 border-t border-gray-200 transition-all duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Comments ({photo.comments.length})
            </h4>
            {photo.comments.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No comments yet</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {photo.comments.map((comment) => (
                  <div key={comment.id} className="text-sm bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{comment.author}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-800">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={onPhotoClick}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium bg-primary-50 hover:bg-primary-100 px-3 py-1 rounded-md transition-colors"
            >
              Add comment →
            </button>
          </div>
        )}
      </div>
    </article>
  )
} 