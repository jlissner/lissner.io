/**
 * Utility functions for photo grid state management
 */

/**
 * Toggles a photo ID in a set of expanded comments
 */
export const togglePhotoInSet = (photoId: string, currentSet: Set<string>): Set<string> => {
  const newSet = new Set(currentSet)
  if (newSet.has(photoId)) {
    newSet.delete(photoId)
  } else {
    newSet.add(photoId)
  }
  return newSet
}

/**
 * Checks if a photo's comments are expanded
 */
export const isPhotoExpanded = (photoId: string, expandedSet: Set<string>): boolean => {
  return expandedSet.has(photoId)
}

/**
 * Creates a new Set with a photo ID added
 */
export const addPhotoToExpandedSet = (photoId: string, currentSet: Set<string>): Set<string> => {
  const newSet = new Set(currentSet)
  newSet.add(photoId)
  return newSet
}

/**
 * Creates a new Set with a photo ID removed
 */
export const removePhotoFromExpandedSet = (photoId: string, currentSet: Set<string>): Set<string> => {
  const newSet = new Set(currentSet)
  newSet.delete(photoId)
  return newSet
}

/**
 * Gets the count of expanded photos
 */
export const getExpandedCount = (expandedSet: Set<string>): number => {
  return expandedSet.size
}

/**
 * Checks if any photos are expanded
 */
export const hasExpandedPhotos = (expandedSet: Set<string>): boolean => {
  return expandedSet.size > 0
}

/**
 * Clears all expanded photos
 */
export const clearExpandedPhotos = (): Set<string> => {
  return new Set()
}

/**
 * Gets an array of expanded photo IDs
 */
export const getExpandedPhotoIds = (expandedSet: Set<string>): string[] => {
  return Array.from(expandedSet)
}
