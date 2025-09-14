import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Photo, PhotoGroup } from '../components/utils/photoUtils'
import {
  isDataLoading,
  findGroupByAlbumId,
  findPhotoById,
  shouldCloseModals,
  shouldOpenAlbum,
  shouldCloseAlbum,
  shouldOpenPhoto,
  shouldClosePhoto,
  buildUrlPath,
  extractUrlParams
} from '../utils/urlNavigationUtils'

export interface UseUrlNavigationProps {
  photos: Photo[]
  filteredDisplay: PhotoGroup[]
  selectedPhoto: Photo | null
  selectedGroup: PhotoGroup | null
  setSelectedPhoto: (photo: Photo | null) => void
  setSelectedGroup: (group: PhotoGroup | null) => void
}

export function useUrlNavigation({
  photos,
  filteredDisplay,
  selectedPhoto,
  selectedGroup,
  setSelectedPhoto,
  setSelectedGroup
}: UseUrlNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle URL parameters for direct links to albums/photos
  useEffect(() => {
    const { albumId, photoId } = extractUrlParams(searchParams)
    
    if (isDataLoading(photos, filteredDisplay)) {
      // Wait for data to load
      return
    }
    
    // If no URL parameters, close any open modals
    if (shouldCloseModals(albumId, photoId)) {
      if (selectedGroup) setSelectedGroup(null)
      if (selectedPhoto) setSelectedPhoto(null)
      return
    }
    
    // Open album if specified and not already open
    const albumOpenResult = shouldOpenAlbum(albumId, selectedGroup, filteredDisplay)
    if (albumOpenResult.shouldOpen && albumOpenResult.group) {
      setSelectedGroup(albumOpenResult.group)
    }
    
    // Close album if URL changed to different album or no album
    if (shouldCloseAlbum(albumId, selectedGroup)) {
      setSelectedGroup(null)
    }
    
    // Open photo if specified and not already open
    const photoOpenResult = shouldOpenPhoto(photoId, selectedPhoto, photos)
    if (photoOpenResult.shouldOpen && photoOpenResult.photo) {
      setSelectedPhoto(photoOpenResult.photo)
    }
    
    // Close photo if URL changed to different photo or no photo
    if (shouldClosePhoto(photoId, selectedPhoto)) {
      setSelectedPhoto(null)
    }
  }, [searchParams, photos, filteredDisplay, selectedGroup, selectedPhoto, setSelectedGroup, setSelectedPhoto])

  // Update URL when modals open/close
  const updateURL = (albumId?: string, photoId?: string) => {
    const newURL = buildUrlPath(albumId, photoId)
    
    // Use replace to avoid creating browser history entries for every modal open/close
    router.replace(newURL)
  }

  return { updateURL }
}
