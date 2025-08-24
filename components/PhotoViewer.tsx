'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface Photo {
  id: string
  url: string
  caption?: string
  [key: string]: any
}

interface PhotoViewerProps {
  photo: Photo
  // Navigation props
  canNavigatePrevious: boolean
  canNavigateNext: boolean
  currentIndex: number
  totalPhotos: number
  onNavigatePrevious: () => void
  onNavigateNext: () => void
  // Loading control
  onImageLoadingChange?: (loading: boolean) => void
}

export const PhotoViewer = ({
  photo,
  canNavigatePrevious,
  canNavigateNext,
  currentIndex,
  totalPhotos,
  onNavigatePrevious,
  onNavigateNext,
  onImageLoadingChange
}: PhotoViewerProps) => {
  const [imageLoading, setImageLoading] = useState(false)

  // Track photo changes for loading state
  useEffect(() => {
    setImageLoading(true)
    onImageLoadingChange?.(true)
  }, [photo.id, photo.url, onImageLoadingChange])

  const handleImageLoad = () => {
    setImageLoading(false)
    onImageLoadingChange?.(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    onImageLoadingChange?.(false)
  }

  return (
    <div className="flex-1 relative min-h-[400px]">
      <Image
        src={photo.url}
        alt={photo.caption || 'Family photo'}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
        className="object-contain bg-gray-100"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {/* Image Loading Overlay */}
      {imageLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="flex flex-col items-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
            <span className="text-sm">Loading image...</span>
          </div>
        </div>
      )}
      
      {/* Navigation Buttons */}
      {totalPhotos > 1 && (
        <>
          {/* Previous Button */}
          {canNavigatePrevious && (
            <button
              onClick={onNavigatePrevious}
              disabled={imageLoading}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous photo (←)"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}
          
          {/* Next Button */}
          {canNavigateNext && (
            <button
              onClick={onNavigateNext}
              disabled={imageLoading}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next photo (→)"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )}
          
          {/* Photo Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} of {totalPhotos}
            {imageLoading && <span className="ml-2">• Loading...</span>}
          </div>
        </>
      )}
    </div>
  )
} 