import { useState, useEffect } from 'react'
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
    <div style={{ 
      flex: 1, 
      position: 'relative', 
      minHeight: '25rem' 
    }}>
      <img
        src={photo.url}
        alt={photo.caption || 'Family photo'}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain',
          background: 'rgba(0, 0, 0, 0.1)'
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {/* Image Loading Overlay */}
      {imageLoading && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <div data-stack="sm" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            color: 'white'
          }}>
            <div data-loading="true" style={{ 
              borderTopColor: 'white',
              marginBottom: '0.5rem'
            }}></div>
            <span style={{ fontSize: '0.875rem' }}>Loading image...</span>
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
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '50%',
                border: 'none',
                cursor: imageLoading ? 'not-allowed' : 'pointer',
                opacity: imageLoading ? 0.3 : 1,
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)'
              }}
              title="Previous photo (←)"
            >
              <ChevronLeftIcon style={{ width: '1.5rem', height: '1.5rem' }} />
            </button>
          )}
          
          {/* Next Button */}
          {canNavigateNext && (
            <button
              onClick={onNavigateNext}
              disabled={imageLoading}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '50%',
                border: 'none',
                cursor: imageLoading ? 'not-allowed' : 'pointer',
                opacity: imageLoading ? 0.3 : 1,
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)'
              }}
              title="Next photo (→)"
            >
              <ChevronRightIcon style={{ width: '1.5rem', height: '1.5rem' }} />
            </button>
          )}
          
          {/* Photo Counter */}
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '0.5rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.875rem',
            backdropFilter: 'blur(8px)'
          }}>
            {currentIndex + 1} of {totalPhotos}
            {imageLoading && <span style={{ marginLeft: '0.5rem' }}>• Loading...</span>}
          </div>
        </>
      )}
    </div>
  )
} 