'use client'

import Image from 'next/image'
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
  priority?: boolean
  onPhotoClick: (photoId: string) => void
  enableSelection?: boolean
  selectedPhotos?: Set<string>
  onSelectionToggle?: (photoId: string) => void
}

export const AlbumPhotosGrid = ({
  photos,
  totalPhotos,
  photosToShow,
  priority = false,
  onPhotoClick,
  enableSelection = false,
  selectedPhotos = new Set(),
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
      {photosToDisplay.map((photo, index) => {
        const isSelected = enableSelection && selectedPhotos.has(photo.id)
        return (
          <div
            key={photo.id}
            className="relative cursor-pointer hover:opacity-80 transition-opacity group"
            onClick={(e) => {
              e.stopPropagation()
              onPhotoClick(photo.id)
            }}
          >
            <div className="relative w-full h-32 overflow-hidden">
              <Image
                src={getImageSource(photo)}
                alt={getPhotoAltText(photo)}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                priority={shouldHavePriority(index, priority)}
              />
            </div>
            {photo.location && (
              <div className="absolute top-1 right-1 text-white text-xs bg-black bg-opacity-50 rounded px-1">
                📍
              </div>
            )}
            
            {/* Selection Checkbox - only shown when selection is enabled */}
            {enableSelection && onSelectionToggle && (
              <>
                {/* Selection Checkbox - visible on hover */}
                <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation()
                      onSelectionToggle(photo.id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                </div>
                
                {/* Selected indicator - always visible when selected */}
                {isSelected && (
                  <div className="absolute top-1 left-1 z-10">
                    <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
      
      {/* Show "+X more" card only if there are actually more photos than being displayed */}
      {shouldShowMore && (
        <div className="relative bg-gray-100 flex items-center justify-center h-32 text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
          <span className="text-sm font-medium">+{moreCount} more</span>
        </div>
      )}
    </div>
  )
}
