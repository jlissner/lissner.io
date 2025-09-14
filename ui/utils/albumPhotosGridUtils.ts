/**
 * Utility functions for album photos grid layout and calculations
 */

export interface Photo {
  id: string
  url: string
  thumbnailUrl?: string
  caption?: string
  location?: string
}

/**
 * Determines the CSS grid columns class based on photo count
 */
export const getGridColumnsClass = (photoCount: number): string => {
  if (photoCount === 1) return 'grid-cols-1'
  if (photoCount === 2) return 'grid-cols-2'
  if (photoCount === 3) return 'grid-cols-3'
  if (photoCount === 4) return 'grid-cols-2'
  if (photoCount === 5) return 'grid-cols-3'
  if (photoCount === 6) return 'grid-cols-3'
  return 'grid-cols-3'
}

/**
 * Determines if the "+X more" card should be displayed
 */
export const shouldShowMoreCard = (totalPhotos: number, photosToShow: number): boolean => {
  return totalPhotos > photosToShow
}

/**
 * Calculates the "more" count for the overflow card
 */
export const getMoreCount = (totalPhotos: number, photosToShow: number): number => {
  return Math.max(0, totalPhotos - photosToShow)
}

/**
 * Gets the appropriate image source (thumbnail or full URL)
 */
export const getImageSource = (photo: Photo): string => {
  return photo.thumbnailUrl || photo.url
}

/**
 * Gets the alt text for a photo
 */
export const getPhotoAltText = (photo: Photo): string => {
  return photo.caption || 'Family photo'
}

/**
 * Determines if a photo should have priority loading
 */
export const shouldHavePriority = (index: number, globalPriority: boolean): boolean => {
  return globalPriority && index === 0
}

/**
 * Gets photos to display (sliced to the show limit)
 */
export const getPhotosToDisplay = (photos: Photo[], photosToShow: number): Photo[] => {
  return photos.slice(0, photosToShow)
}

/**
 * Calculates complete grid layout information
 */
export const calculateGridLayout = (
  photos: Photo[],
  totalPhotos: number,
  photosToShow: number
): {
  photosToDisplay: Photo[]
  gridColumnsClass: string
  shouldShowMore: boolean
  moreCount: number
} => {
  const photosToDisplay = getPhotosToDisplay(photos, photosToShow)
  const gridColumnsClass = getGridColumnsClass(photos.length)
  const shouldShowMore = shouldShowMoreCard(totalPhotos, photosToShow)
  const moreCount = getMoreCount(totalPhotos, photosToShow)
  
  return {
    photosToDisplay,
    gridColumnsClass,
    shouldShowMore,
    moreCount
  }
}
