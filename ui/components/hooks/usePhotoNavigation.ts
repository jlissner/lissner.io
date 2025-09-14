import { useEffect, useMemo, useRef } from 'react'
import { Photo } from '../../types/photo'

interface UsePhotoNavigationProps {
  photo: Photo
  albumPhotos?: Photo[]
  albumHasMore?: boolean
  albumLoadingMore?: boolean
  estimatedTotalPhotos?: number
  onNavigateToPhoto?: (photo: Photo) => void
  onLoadMorePhotos?: () => Promise<void>
  onClose: () => void
}

export const usePhotoNavigation = ({
  photo,
  albumPhotos,
  albumHasMore,
  albumLoadingMore,
  estimatedTotalPhotos,
  onNavigateToPhoto,
  onLoadMorePhotos,
  onClose
}: UsePhotoNavigationProps) => {
  // Track if we're waiting for more photos to load for navigation
  const pendingNextNavigation = useRef(false)
  
  // Calculate navigation state
  const navigationState = useMemo(() => {
    if (!albumPhotos || !onNavigateToPhoto) {
      return {
        currentIndex: -1,
        canNavigatePrevious: false,
        canNavigateNext: false,
        totalPhotos: 0
      }
    }

    const currentIndex = albumPhotos.findIndex(p => p.id === photo.id)
    const canNavigatePrevious = currentIndex > 0
    // Can navigate next if there's a next photo OR if there are more photos to load
    const canNavigateNext = currentIndex >= 0 && (
      currentIndex < albumPhotos.length - 1 || 
      (albumHasMore && !albumLoadingMore)
    )

    return {
      currentIndex,
      canNavigatePrevious,
      canNavigateNext,
      totalPhotos: estimatedTotalPhotos || albumPhotos.length
    }
  }, [photo.id, albumPhotos, onNavigateToPhoto, albumHasMore, albumLoadingMore, estimatedTotalPhotos])

  // Effect to handle navigation after loading more photos
  useEffect(() => {
    if (pendingNextNavigation.current && !albumLoadingMore && albumPhotos && onNavigateToPhoto) {
      const currentIndex = albumPhotos.findIndex(p => p.id === photo.id)
      if (currentIndex >= 0 && currentIndex < albumPhotos.length - 1) {
        // Now we can navigate to the next photo
        onNavigateToPhoto(albumPhotos[currentIndex + 1])
        pendingNextNavigation.current = false
      } else {
        // Reset the flag if we can't navigate (reached the end or photo not found)
        console.log('Auto-navigation: No next photo available after loading, resetting flag')
        pendingNextNavigation.current = false
      }
    }
  }, [albumLoadingMore, albumPhotos, photo.id, onNavigateToPhoto])

  // Navigation functions
  const navigateToPrevious = () => {
    if (navigationState.canNavigatePrevious && albumPhotos && onNavigateToPhoto) {
      onNavigateToPhoto(albumPhotos[navigationState.currentIndex - 1])
    }
  }

  const navigateToNext = async () => {
    if (!albumPhotos || !onNavigateToPhoto) return

    console.log('Navigate to next:', {
      currentIndex: navigationState.currentIndex,
      albumPhotosLength: albumPhotos.length,
      canNavigateNext: navigationState.canNavigateNext,
      albumHasMore,
      albumLoadingMore,
      pendingNavigation: pendingNextNavigation.current
    })

    if (navigationState.canNavigateNext) {
      if (navigationState.currentIndex < albumPhotos.length - 1) {
        // Navigate to next photo if available
        const nextPhoto = albumPhotos[navigationState.currentIndex + 1]
        if (nextPhoto) {
          console.log('Navigating to existing next photo:', nextPhoto.id)
          onNavigateToPhoto(nextPhoto)
        } else {
          console.error('Next photo is undefined at index:', navigationState.currentIndex + 1)
        }
      } else if (albumHasMore && !albumLoadingMore && onLoadMorePhotos && !pendingNextNavigation.current) {
        // If at the end but more photos available, load more and then navigate
        console.log('Auto-loading more photos for navigation')
        try {
          pendingNextNavigation.current = true
          await onLoadMorePhotos()
          // Navigation will be handled by the useEffect after photos are loaded
        } catch (error) {
          console.error('Failed to load more photos for navigation:', error)
          pendingNextNavigation.current = false
        }
      }
    } else {
      console.log('Cannot navigate next: reached end or no more photos available')
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigateToPrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigateToNext()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, navigateToPrevious, navigateToNext])

  return {
    ...navigationState,
    navigateToPrevious,
    navigateToNext
  }
} 