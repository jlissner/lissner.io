import { Photo, PhotoGroup } from '../components/utils/photoUtils'

/**
 * Get the album photos for the selected photo
 */
export function getAlbumPhotosForSelectedPhoto(
  selectedPhoto: Photo | null,
  filteredDisplay: PhotoGroup[]
): Photo[] | undefined {
  if (!selectedPhoto) return undefined
  
  // Find the group that contains this photo
  const containingGroup = filteredDisplay.find(group => 
    group.photos.some(p => p.id === selectedPhoto.id)
  )
  
  // If it's a group (album), return all photos in the group
  if (containingGroup && containingGroup.isGroup) {
    return containingGroup.photos.sort((a, b) => 
      new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    )
  }
  
  // If it's a single photo, no album navigation
  return undefined
}

/**
 * Select all photos from the filtered display
 */
export function selectAllPhotos(
  filteredDisplay: PhotoGroup[]
): string[] {
  const allPhotoIds: string[] = []
  filteredDisplay.forEach(group => {
    group.photos.forEach(photo => allPhotoIds.push(photo.id))
  })
  return allPhotoIds
}

/**
 * Generate filter message for no results
 */
export function getFilterMessage(
  selectedTags: string[],
  selectedUsers: string[]
): string {
  if (selectedTags.length > 0 && selectedUsers.length > 0) {
    return 'tags or users'
  }
  if (selectedTags.length > 0) {
    return 'tags'
  }
  return 'users'
}

/**
 * Count total filtered photos
 */
export function countFilteredPhotos(filteredDisplay: PhotoGroup[]): number {
  return filteredDisplay.reduce((acc, group) => acc + group.photos.length, 0)
}

/**
 * Check if load more albums button should be shown
 */
export function shouldShowLoadMoreAlbums(
  showAllAlbums: boolean,
  filteredDisplay: PhotoGroup[]
): boolean {
  return !showAllAlbums && filteredDisplay.filter(g => g.isGroup).length >= 4
}

/**
 * Check if end of photos message should be shown
 */
export function shouldShowEndOfPhotos(
  hasMore: boolean,
  photosLength: number,
  selectedTags: string[],
  selectedUsers: string[]
): boolean {
  return !hasMore && 
         photosLength > 0 && 
         selectedTags.length === 0 && 
         selectedUsers.length === 0
}
