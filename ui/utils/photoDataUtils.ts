import { Photo } from '../components/utils/photoUtils'
import { getPhotos, getAlbums } from '../lib/api'

// Type definitions
export type AlbumMetadata = {
  name: string
  photoCount: number
  comments?: Array<{id: string; content: string; author: string; createdAt: string}>
  reactions?: Array<{id: string; type: string; author: string; createdAt: string}>
}

export type PhotoLoadResult = {
  photos: Photo[]
  lastKey: string | null
  hasMore: boolean
}

/**
 * Loads initial photos with album diversity logic
 * Ensures we have photos from at least 4 different albums
 */
export const loadInitialPhotos = async (): Promise<PhotoLoadResult> => {
  let photos: Photo[] = []
  let currentLastKey: string | undefined = undefined
  let hasMorePhotos = true
  
  // For initial load, keep loading until we have photos from at least 4 different albums
  let albumCount = 0
  const seenAlbums = new Set<string>()
  let totalLoaded = 0
  const maxPhotosToLoad = 300 // Safety limit
  
  while (albumCount < 4 && hasMorePhotos && totalLoaded < maxPhotosToLoad) {
    const data = await getPhotos(currentLastKey, 50)
    const newPhotos = data.photos.filter((p: Photo) => {
      const existingIds = new Set(photos.map(photo => photo.id))
      return !existingIds.has(p.id)
    })
    
    photos = [...photos, ...newPhotos]
    totalLoaded += newPhotos.length
    
    // Count unique albums
    newPhotos.forEach((photo: Photo) => {
      if (photo.uploadSessionId) {
        seenAlbums.add(photo.uploadSessionId)
      }
    })
    albumCount = seenAlbums.size
    
    currentLastKey = data.lastKey
    hasMorePhotos = !!data.lastKey
    
    // If we've loaded a good amount or no more photos, break
    if (!hasMorePhotos || newPhotos.length === 0) break
  }
  
  return {
    photos,
    lastKey: currentLastKey || null,
    hasMore: hasMorePhotos
  }
}

/**
 * Loads additional photos for pagination
 */
export const loadAdditionalPhotos = async (
  currentPhotos: Photo[], 
  lastKey: string | null
): Promise<PhotoLoadResult> => {
  const data = await getPhotos(lastKey || undefined, 20)
  
  // Filter out duplicates
  const existingIds = new Set(currentPhotos.map((p: Photo) => p.id))
  const newPhotos = data.photos.filter((p: Photo) => !existingIds.has(p.id))
  
  return {
    photos: [...currentPhotos, ...newPhotos],
    lastKey: data.lastKey || null,
    hasMore: !!data.lastKey
  }
}

/**
 * Loads album metadata and returns a Map
 */
export const loadAlbumMetadata = async (): Promise<Map<string, AlbumMetadata>> => {
  const response = await getAlbums()
  const metadata = new Map<string, AlbumMetadata>()
  
  response.albums.forEach((album: any) => {
    metadata.set(album.id, {
      name: album.name,
      photoCount: album.photoCount,
      comments: album.comments || [],
      reactions: album.reactions || []
    })
  })
  
  return metadata
}

/**
 * Extracts unique tags from photos
 */
export const extractUniqueTags = (photos: Photo[]): string[] => {
  const tagSet = new Set<string>()
  photos.forEach(photo => {
    photo.tags.forEach(tag => tagSet.add(tag))
  })
  return Array.from(tagSet).sort()
}

/**
 * Extracts unique users from photos
 */
export const extractUniqueUsers = (photos: Photo[]): string[] => {
  const userSet = new Set<string>()
  photos.forEach(photo => {
    userSet.add(photo.uploadedBy)
  })
  return Array.from(userSet).sort()
}

/**
 * Checks if should load more photos based on scroll position
 */
export const shouldLoadMorePhotos = (): boolean => {
  return window.innerHeight + document.documentElement.scrollTop 
    >= document.documentElement.offsetHeight - 1000
}
