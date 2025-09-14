'use client'

import React from 'react'
import Image from 'next/image'
import { Photo } from './utils/photoUtils'

interface AlbumPhotoGridProps {
  albumPhotos: Photo[]
  selectionMode: boolean
  selectedPhotos: Set<string>
  isOperationInProgress: boolean
  onPhotoClick: (photo: Photo) => void
  onPhotoSelect: (photoId: string) => void
  albumLoading: boolean
  albumLoadingMore: boolean
  albumHasMore: boolean
}

export const AlbumPhotoGrid = ({
  albumPhotos,
  selectionMode,
  selectedPhotos,
  isOperationInProgress,
  onPhotoClick,
  onPhotoSelect,
  albumLoading,
  albumLoadingMore,
  albumHasMore
}: AlbumPhotoGridProps) => {
  return (
    <div className="p-3 sm:p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Photos ({albumPhotos.length})
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
        {albumPhotos.map((photo) => {
          const photoSrc = photo.thumbnailUrl || photo.url
          
          // Skip photos without valid URLs
          if (!photoSrc || photoSrc.trim() === '') {
            console.warn('Skipping photo with missing URL:', photo.id)
            return null
          }
          
          return (
            <div
              key={photo.id}
              className="relative cursor-pointer hover:opacity-80 transition-opacity group"
              onClick={() => {
                if (selectionMode) {
                  onPhotoSelect(photo.id)
                } else {
                  onPhotoClick(photo)
                }
              }}
            >
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <Image
                  src={photoSrc}
                  alt={photo.caption || 'Family photo'}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              
              {/* Selection Checkbox */}
              {selectionMode && (
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedPhotos.has(photo.id)}
                    disabled={isOperationInProgress}
                    onChange={(e) => {
                      e.stopPropagation()
                      onPhotoSelect(photo.id)
                    }}
                    className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}
              
              {/* Photo overlay with info */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-end">
                <div className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.caption && (
                    <p className="font-medium mb-1 line-clamp-2">{photo.caption}</p>
                  )}
                  <p>{new Date(photo.uploadedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )
        }).filter(Boolean)}
      </div>

      {/* Loading indicators */}
      {albumLoading && albumPhotos.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="text-sm">Loading album photos...</span>
          </div>
        </div>
      )}
      
      {albumLoadingMore && albumPhotos.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span className="text-sm">Loading more photos...</span>
          </div>
        </div>
      )}
      
      {/* End of album indicator */}
      {!albumHasMore && albumPhotos.length > 0 && (
        <div className="text-center py-6 text-gray-500">
          <div className="text-gray-400 text-2xl mb-1">📸</div>
          <p className="text-sm">You've seen all photos in this album!</p>
        </div>
      )}
      
      {albumPhotos.length === 0 && !albumLoading && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-gray-400 text-4xl mb-2">📷</div>
          <p className="text-lg font-medium mb-1">No photos in this album yet</p>
          <p className="text-sm">Add some photos to get started!</p>
        </div>
      )}
    </div>
  )
}
