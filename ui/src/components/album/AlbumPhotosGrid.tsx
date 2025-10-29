'use client'

// Using regular img tag instead of Next.js Image
import { Photo } from '../utils/photoUtils'
import { 
  calculateGridLayout,
  getImageSource,
  getPhotoAltText,
  shouldHavePriority
} from '../../utils/albumPhotosGridUtils'

interface AlbumPhotosGridProps {
  photos: Photo[]
  totalPhotos: number
  photosToShow: number
  selectionMode: boolean
  selectedPhotos: Set<string>
  priority?: boolean
  onPhotoClick: (photoId: string) => void
  onSelectionToggle: (photoId: string) => void
}

export const AlbumPhotosGrid = ({
  photos,
  totalPhotos,
  photosToShow,
  selectionMode,
  selectedPhotos,
  priority = false,
  onPhotoClick,
  onSelectionToggle
}: AlbumPhotosGridProps) => {
  const { 
    photosToDisplay, 
    gridColumnsClass, 
    shouldShowMore, 
    moreCount 
  } = calculateGridLayout(photos, totalPhotos, photosToShow)

  return (
    <div className={`grid ${gridColumnsClass} gap-1`}>
      {photosToDisplay.map((photo, index) => (
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
            <img
              src={getImageSource(photo)}
              alt={getPhotoAltText(photo)}
              className="w-full h-full object-cover"
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
      {shouldShowMore && (
        <div className="relative bg-gray-100 flex items-center justify-center h-32 text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
          <span className="text-sm font-medium">+{moreCount} more</span>
        </div>
      )}
    </div>
  )
}
