/**
 * Utility functions for URL navigation and parameter handling
 */

export interface Photo {
  id: string
  [key: string]: any
}

export interface PhotoGroup {
  albumId?: string
  [key: string]: any
}

/**
 * Determines if data is still loading
 */
export const isDataLoading = (photos: Photo[], filteredDisplay: PhotoGroup[]): boolean => {
  return photos.length === 0 && filteredDisplay.length === 0
}

/**
 * Finds a photo group by album ID
 */
export const findGroupByAlbumId = (groups: PhotoGroup[], albumId: string): PhotoGroup | undefined => {
  return groups.find(g => g.albumId === albumId)
}

/**
 * Finds a photo by photo ID
 */
export const findPhotoById = (photos: Photo[], photoId: string): Photo | undefined => {
  return photos.find(p => p.id === photoId)
}

/**
 * Checks if modals should be closed (no URL parameters)
 */
export const shouldCloseModals = (albumId: string | null, photoId: string | null): boolean => {
  return !albumId && !photoId
}

/**
 * Checks if an album should be opened
 */
export const shouldOpenAlbum = (
  albumId: string | null,
  selectedGroup: PhotoGroup | null,
  groups: PhotoGroup[]
): { shouldOpen: boolean; group?: PhotoGroup } => {
  if (!albumId || selectedGroup) {
    return { shouldOpen: false }
  }
  
  const group = findGroupByAlbumId(groups, albumId)
  return {
    shouldOpen: !!group,
    group
  }
}

/**
 * Checks if an album should be closed
 */
export const shouldCloseAlbum = (albumId: string | null, selectedGroup: PhotoGroup | null): boolean => {
  return !albumId && !!selectedGroup
}

/**
 * Checks if a photo should be opened
 */
export const shouldOpenPhoto = (
  photoId: string | null,
  selectedPhoto: Photo | null,
  photos: Photo[]
): { shouldOpen: boolean; photo?: Photo } => {
  if (!photoId || selectedPhoto) {
    return { shouldOpen: false }
  }
  
  const photo = findPhotoById(photos, photoId)
  return {
    shouldOpen: !!photo,
    photo
  }
}

/**
 * Checks if a photo should be closed
 */
export const shouldClosePhoto = (photoId: string | null, selectedPhoto: Photo | null): boolean => {
  return !photoId && !!selectedPhoto
}

/**
 * Creates URL search parameters
 */
export const createUrlParams = (albumId?: string, photoId?: string): URLSearchParams => {
  const params = new URLSearchParams()
  if (albumId) params.set('album', albumId)
  if (photoId) params.set('photo', photoId)
  return params
}

/**
 * Builds the complete URL path with query parameters
 */
export const buildUrlPath = (albumId?: string, photoId?: string): string => {
  const params = createUrlParams(albumId, photoId)
  const queryString = params.toString()
  return queryString ? `/?${queryString}` : '/'
}

/**
 * Extracts album and photo IDs from search parameters
 */
export const extractUrlParams = (searchParams: URLSearchParams): { albumId: string | null; photoId: string | null } => {
  return {
    albumId: searchParams.get('album'),
    photoId: searchParams.get('photo')
  }
}
