/**
 * Utility functions for album header text formatting and display
 */

/**
 * Formats the photo count text for album headers
 */
export const formatPhotoCountText = (
  totalPhotos: number,
  photosToShow: number,
  estimatedTotalCount?: number,
  potentiallyIncomplete?: boolean
): string => {
  if (potentiallyIncomplete && estimatedTotalCount && estimatedTotalCount > photosToShow) {
    return `${photosToShow} of ${estimatedTotalCount} photos`
  }
  
  return `${estimatedTotalCount || totalPhotos} photos`
}

/**
 * Determines if album name should be displayed
 */
export const shouldShowAlbumName = (albumName?: string, albumId?: string): boolean => {
  return Boolean(albumName && albumId)
}

/**
 * Gets the display text for the album badge
 */
export const getAlbumBadgeText = (): string => {
  return '📁 Album'
}

/**
 * Formats the complete header subtitle (photo count + time)
 */
export const formatHeaderSubtitle = (
  totalPhotos: number,
  photosToShow: number,
  uploadedAt: string,
  getRelativeTime: (date: string) => string,
  estimatedTotalCount?: number,
  potentiallyIncomplete?: boolean
): string => {
  const photoText = formatPhotoCountText(totalPhotos, photosToShow, estimatedTotalCount, potentiallyIncomplete)
  const timeText = getRelativeTime(uploadedAt)
  
  return `${photoText} • ${timeText}`
}
