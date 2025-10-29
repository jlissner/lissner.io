import { Photo, PhotoGroup } from './photoUtils'

// Group photos by upload session ID (photos uploaded together)
export const groupPhotos = (
  photos: Photo[], 
  showAllAlbums: boolean = false,
  albumMetadata: Map<string, { name: string; photoCount: number }> = new Map(),
  hasMore: boolean = true
): PhotoGroup[] => {
  const groups: PhotoGroup[] = []
  const processed = new Set<string>()
  
  photos.forEach(photo => {
    if (processed.has(photo.id)) return
    
    let relatedPhotos: Photo[] = []
    let potentiallyIncomplete = false
    
    if (photo.uploadSessionId) {
      // Group by uploadSessionId (albums)
      relatedPhotos = photos.filter(p => 
        p.uploadSessionId === photo.uploadSessionId &&
        p.uploadedBy === photo.uploadedBy
      )
      
      // Check if this group might be incomplete (if we're near the end of loaded photos
      // and this album is recent, there might be more photos not yet loaded)
      const photoIndex = photos.findIndex(p => p.id === photo.id)
      const isNearEnd = photoIndex >= photos.length - 10 // Last 10 photos
      const isRecent = new Date(photo.uploadedAt).getTime() > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
      potentiallyIncomplete = isNearEnd && isRecent && hasMore
      
    } else {
      // Fallback to timing-based grouping for old photos without uploadSessionId
      const uploadTime = new Date(photo.uploadedAt).getTime()
      relatedPhotos = photos.filter(p => 
        p.uploadedBy === photo.uploadedBy &&
        !p.uploadSessionId && // Only group old photos without session ID
        Math.abs(new Date(p.uploadedAt).getTime() - uploadTime) <= 60000 // 1 minute
      )
    }
    
    // Mark all related photos as processed
    relatedPhotos.forEach(p => processed.add(p.id))
    
    // Sort related photos by upload time
    relatedPhotos.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
    
    if (relatedPhotos.length > 1) {
      // Create a group (album)
      const albumMeta = photo.uploadSessionId ? albumMetadata.get(photo.uploadSessionId) : undefined
      const actualTotalCount = albumMeta?.photoCount || relatedPhotos.length
      
      groups.push({
        id: photo.uploadSessionId ? `album-${photo.uploadSessionId}` : `group-${photo.id}`,
        photos: relatedPhotos,
        uploadedBy: photo.uploadedBy,
        uploadedAt: relatedPhotos[0].uploadedAt, // Use earliest upload time
        isGroup: true,
        potentiallyIncomplete: potentiallyIncomplete,
        albumId: photo.uploadSessionId,
        albumName: albumMeta?.name || photo.albumName || (photo.uploadSessionId ? `Album from ${new Date(photo.uploadedAt).toLocaleDateString()}` : undefined),
        estimatedTotalCount: actualTotalCount,
        comments: albumMeta?.comments || [],
        reactions: albumMeta?.reactions || []
      })
    } else {
      // Single photo
      groups.push({
        id: photo.id,
        photos: [photo],
        uploadedBy: photo.uploadedBy,
        uploadedAt: photo.uploadedAt,
        isGroup: false,
        potentiallyIncomplete: false
      })
    }
  })
  
  // Sort groups by upload time (newest first)
  const sortedGroups = groups.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  
  // If showing all albums, return all groups
  if (showAllAlbums) {
    return sortedGroups
  }
  
  // For initial loading, focus on latest 4 albums with more photos from each
  const albumGroups = sortedGroups.filter(g => g.isGroup)
  const singlePhotos = sortedGroups.filter(g => !g.isGroup)
  
  // Take first 4 albums and show up to 6 photos from each for better preview
  const previewAlbums = albumGroups.slice(0, 4).map(group => {
    const previewPhotos = group.photos.slice(0, 6)
    const albumMeta = group.albumId ? albumMetadata.get(group.albumId) : undefined
    const actualTotalCount = albumMeta?.photoCount || group.photos.length
    
    return {
      ...group,
      photos: previewPhotos,
      estimatedTotalCount: actualTotalCount,
      potentiallyIncomplete: actualTotalCount > previewPhotos.length
    }
  })
  
  // Include single photos that aren't part of the first 10 albums
  const albumIds = new Set(previewAlbums.map(a => a.albumId).filter(Boolean))
  const independentSinglePhotos = singlePhotos.filter(p => !p.albumId || !albumIds.has(p.albumId))
  
  return [...previewAlbums, ...independentSinglePhotos.slice(0, 10)]
}

// Filter photos based on selected tags and users
export const filterPhotos = (
  photos: Photo[],
  selectedTags: string[],
  selectedUsers: string[]
): Photo[] => {
  let filtered = photos
  
  // Filter by tags
  if (selectedTags.length > 0) {
    filtered = filtered.filter(photo => 
      selectedTags.every(selectedTag => photo.tags.includes(selectedTag))
    )
  }
  
  // Filter by users
  if (selectedUsers.length > 0) {
    filtered = filtered.filter(photo => 
      selectedUsers.includes(photo.uploadedBy)
    )
  }
  
  return filtered
}

// Convert filtered photos to display groups
export const getFilteredDisplay = (
  photos: Photo[],
  selectedTags: string[],
  selectedUsers: string[],
  showAllAlbums: boolean,
  albumMetadata: Map<string, { name: string; photoCount: number }>,
  hasMore: boolean
): PhotoGroup[] => {
  const filtered = filterPhotos(photos, selectedTags, selectedUsers)
  
  // Always return grouped photos
  return groupPhotos(filtered, showAllAlbums, albumMetadata, hasMore)
} 