'use client'

import { PhotoGroup } from './utils/photoUtils'
import { useAlbumCardReactions } from '../hooks/useAlbumCardReactions'
import { AlbumHeader } from './album/AlbumHeader'
import { AlbumPhotosGrid } from './album/AlbumPhotosGrid'
import { AlbumReactionSummary } from './album/AlbumReactionSummary'

interface PhotoGroupCardProps {
  group: PhotoGroup
  onGroupClick: (group: PhotoGroup) => void
  onPhotoClick: (photoId: string) => void
  enableSelection?: boolean
  selectedPhotos?: Set<string>
  onSelectionToggle?: (photoId: string) => void
}

export const PhotoGroupCard = ({
  group,
  onGroupClick,
  onPhotoClick,
  enableSelection = false,
  selectedPhotos = new Set(),
  onSelectionToggle,
  priority = false
}: PhotoGroupCardProps & { priority?: boolean }) => {
  // Calculate display metrics
  const totalPhotos = group.estimatedTotalCount || group.photos.length
  const photosToShow = totalPhotos === 6 ? 6 : Math.min(5, group.photos.length)
  
  // Use the extracted album reactions hook
  const albumReactions = useAlbumCardReactions({
    albumId: group.albumId,
    initialReactions: group.reactions || []
  })

  // Handle emoji picker toggle
  const handleToggleEmojiPicker = (e: React.MouseEvent) => {
    e.stopPropagation()
    albumReactions.setShowEmojiPicker(!albumReactions.showEmojiPicker)
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={() => onGroupClick(group)}
    >
      {/* Album Header */}
      <AlbumHeader
        uploadedBy={group.uploadedBy}
        uploadedAt={group.uploadedAt}
        albumName={group.albumName}
        albumId={group.albumId}
        totalPhotos={totalPhotos}
        photosToShow={photosToShow}
        estimatedTotalCount={group.estimatedTotalCount}
        potentiallyIncomplete={group.potentiallyIncomplete}
      />
      
      {/* Photos Grid */}
      <AlbumPhotosGrid
        photos={group.photos}
        totalPhotos={totalPhotos}
        photosToShow={photosToShow}
        priority={priority}
        onPhotoClick={onPhotoClick}
        enableSelection={enableSelection}
        selectedPhotos={selectedPhotos}
        onSelectionToggle={onSelectionToggle}
      />
      
      {/* Summary Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="text-sm text-gray-600 mb-2">
          {group.photos.some(p => p.caption) && (
            <div className="mb-2">
              <span className="font-medium">Captions:</span> {group.photos.filter(p => p.caption).length} of {group.photos.length} photos
            </div>
          )}
          
          <AlbumReactionSummary
            reactions={albumReactions.localReactions}
            userReactions={albumReactions.userReactions}
            showEmojiPicker={albumReactions.showEmojiPicker}
            isUpdatingReaction={albumReactions.isUpdatingReaction}
            canReact={albumReactions.canReact}
            commentCount={group.comments?.length || 0}
            onReactionClick={albumReactions.handleReactionClick}
            onToggleEmojiPicker={handleToggleEmojiPicker}
            onEmojiSelect={albumReactions.handleEmojiSelect}
            onCloseEmojiPicker={() => albumReactions.setShowEmojiPicker(false)}
          />
        </div>
      </div>
    </div>
  )
} 