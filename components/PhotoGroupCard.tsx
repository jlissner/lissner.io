'use client'

import Image from 'next/image'
import { PhotoGroup } from './utils/photoUtils'
import { getUserColor, getUserInitials, getDisplayName, getRelativeTime } from './utils/photoUtils'

interface PhotoGroupCardProps {
  group: PhotoGroup
  selectionMode: boolean
  selectedPhotos: Set<string>
  onGroupClick: (group: PhotoGroup) => void
  onPhotoClick: (photoId: string) => void
  onSelectionToggle: (photoId: string) => void
}

export const PhotoGroupCard = ({
  group,
  selectionMode,
  selectedPhotos,
  onGroupClick,
  onPhotoClick,
  onSelectionToggle,
  priority = false
}: PhotoGroupCardProps & { priority?: boolean }) => {
  // Calculate how many photos we're actually showing
  const totalPhotos = group.estimatedTotalCount || group.photos.length
  const photosToShow = totalPhotos === 6 ? 6 : Math.min(5, group.photos.length)

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={() => onGroupClick(group)}
    >
      {/* Group Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full ${getUserColor(group.uploadedBy)} flex items-center justify-center text-white text-sm font-medium`}>
            {getUserInitials(group.uploadedBy)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <div className="text-sm font-medium text-gray-900">
                {getDisplayName(group.uploadedBy)}
              </div>
              {group.albumName && (
                <span className="text-xs text-gray-500">•</span>
              )}
              {group.albumName && group.albumId && (
                <div className="text-xs text-gray-700 font-medium">
                  {group.albumName}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {group.potentiallyIncomplete && group.estimatedTotalCount && group.estimatedTotalCount > photosToShow
                ? `${photosToShow} of ${group.estimatedTotalCount} photos`
                : `${group.estimatedTotalCount || group.photos.length} photos`
              } • {getRelativeTime(group.uploadedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
            📁 Album
          </div>

        </div>
      </div>
      
      {/* Photos Grid within Group */}
      <div className={`grid ${
        group.photos.length === 1 ? 'grid-cols-1' :
        group.photos.length === 2 ? 'grid-cols-2' :
        group.photos.length === 3 ? 'grid-cols-3' :
        group.photos.length === 4 ? 'grid-cols-2' :
        group.photos.length === 5 ? 'grid-cols-3' :
        group.photos.length === 6 ? 'grid-cols-3' :
        'grid-cols-3'
      } gap-1`}>
        {group.photos.slice(0, photosToShow).map((photo, index) => (
          <div
            key={photo.id}
            className="relative cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              if (selectionMode) {
                onSelectionToggle(photo.id)
              } else {
                onPhotoClick(photo.id)
              }
            }}
          >
            <div className="relative w-full h-32 overflow-hidden">
              <Image
                src={photo.thumbnailUrl || photo.url}
                alt={photo.caption || 'Family photo'}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                priority={priority && index === 0}
              />
            </div>
            {photo.location && (
              <div className="absolute top-1 right-1 text-white text-xs bg-black bg-opacity-50 rounded px-1">
                📍
              </div>
            )}
            
            {/* Selection Checkbox */}
            {selectionMode && (
              <div className="absolute top-1 left-1 z-10">
                <input
                  type="checkbox"
                  checked={selectedPhotos.has(photo.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    onSelectionToggle(photo.id)
                  }}
                  className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
            )}
          </div>
        ))}
        
        {/* Show "+X more" card only if there are actually more photos than being displayed */}
        {totalPhotos > photosToShow && (
          <div className="relative bg-gray-100 flex items-center justify-center h-32 text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
            <span className="text-sm font-medium">+{totalPhotos - photosToShow} more</span>
          </div>
        )}
      </div>
      
      {/* Group Summary */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="text-sm text-gray-600 mb-2">
          {group.photos.some(p => p.caption) && (
            <div className="mb-2">
              <span className="font-medium">Captions:</span> {group.photos.filter(p => p.caption).length} of {group.photos.length} photos
            </div>
          )}
          <div className="flex items-center space-x-4">
            {/* Show album reaction emojis */}
            <div className="flex items-center space-x-1">
              {(() => {
                // Only show album-level reactions
                const albumReactions = group.reactions || []
                
                // Group by emoji type
                const reactionCounts = albumReactions.reduce((acc, reaction) => {
                  acc[reaction.type] = (acc[reaction.type] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
                
                const entries = Object.entries(reactionCounts)
                
                if (entries.length === 0) {
                  return (
                    <span className="flex items-center space-x-1 text-gray-400">
                      <span>👍</span>
                      <span>0</span>
                    </span>
                  )
                }
                
                // Show up to 3 different emoji types, then +X more if needed
                const maxShow = 3
                const shown = entries.slice(0, maxShow)
                const remaining = entries.slice(maxShow)
                const totalRemaining = remaining.reduce((acc, [, count]) => acc + count, 0)
                
                return (
                  <>
                    {shown.map(([emoji, count]) => (
                      <span key={emoji} className="flex items-center space-x-1">
                        <span>{emoji}</span>
                        <span>{count}</span>
                      </span>
                    ))}
                    {totalRemaining > 0 && (
                      <span className="text-gray-500 text-xs">
                        +{totalRemaining} more
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
            <span className="flex items-center space-x-1">
              <span>💬</span>
              <span>{group.comments?.length || 0}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 