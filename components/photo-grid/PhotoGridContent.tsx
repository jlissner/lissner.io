import { Photo, PhotoGroup } from '../utils/photoUtils'
import { PhotoCard } from '../PhotoCard'
import { PhotoGroupCard } from '../PhotoGroupCard'
import { getFilterMessage } from '../../utils/photoGridUtils'

interface PhotoGridContentProps {
  filteredDisplay: PhotoGroup[]
  selectedTags: string[]
  selectedUsers: string[]
  selectionMode: boolean
  selectedPhotos: Set<string>
  expandedComments: Set<string>
  onClearAllFilters: () => void
  onGroupClick: (group: PhotoGroup) => void
  onPhotoClick: (photo: Photo) => void
  onSelectionToggle: (photoId: string) => void
  onCommentToggle: (photoId: string, event: React.MouseEvent) => void
}

export function PhotoGridContent({
  filteredDisplay,
  selectedTags,
  selectedUsers,
  selectionMode,
  selectedPhotos,
  expandedComments,
  onClearAllFilters,
  onGroupClick,
  onPhotoClick,
  onSelectionToggle,
  onCommentToggle
}: PhotoGridContentProps) {
  if (filteredDisplay.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🏷️</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No photos match your filters</h3>
        <p className="text-gray-600 mb-4">
          Try removing some {getFilterMessage(selectedTags, selectedUsers)} or clearing all filters.
        </p>
        <button
          onClick={onClearAllFilters}
          className="btn-primary"
        >
          Clear All Filters
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {filteredDisplay.map((group, index) => (
        <div key={group.id} className="mb-6">
          {group.isGroup ? (
            <PhotoGroupCard
              group={group}
              selectionMode={selectionMode}
              selectedPhotos={selectedPhotos}
              onGroupClick={onGroupClick}
              onPhotoClick={(photoId) => {
                const photo = group.photos.find(p => p.id === photoId)
                if (photo) onPhotoClick(photo)
              }}
              onSelectionToggle={onSelectionToggle}
              priority={index < 2}
            />
          ) : (
            <PhotoCard
              photo={group.photos[0]}
              selectionMode={selectionMode}
              selectedPhotos={selectedPhotos}
              selectedTags={selectedTags}
              expandedComments={expandedComments}
              onPhotoClick={() => {
                if (selectionMode) {
                  onSelectionToggle(group.photos[0].id)
                } else {
                  onPhotoClick(group.photos[0])
                }
              }}
              onSelectionToggle={onSelectionToggle}
              onCommentToggle={onCommentToggle}
              priority={index < 2}
            />
          )}
        </div>
      ))}
    </div>
  )
}
