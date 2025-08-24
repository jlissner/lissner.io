import { useState, useEffect, useMemo } from 'react'
import { getPhotos, getAlbums } from '@/lib/api'
import { Photo } from '../utils/photoUtils'
import { getFilteredDisplay } from '../utils/photoGrouping'
import toast from 'react-hot-toast'

export const usePhotoData = () => {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastKey, setLastKey] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showAllAlbums, setShowAllAlbums] = useState(false)
  const [albumMetadata, setAlbumMetadata] = useState<Map<string, { 
    name: string; 
    photoCount: number;
    comments?: Array<{id: string; content: string; author: string; createdAt: string}>;
    reactions?: Array<{id: string; type: 'like' | 'love' | 'laugh'; author: string; createdAt: string}>;
  }>>(new Map())

  // Load saved preferences - removed viewMode
  useEffect(() => {
    // No more localStorage loading needed for view preferences
  }, [])

  // Save preferences when they change - removed viewMode
  useEffect(() => {
    // No more localStorage saving needed for view preferences
  }, [])

  const loadPhotos = async (reset = false) => {
    try {
      let photos: Photo[] = []
      let currentLastKey = reset ? undefined : lastKey || undefined
      let hasMorePhotos = true
      
      if (reset) {
        // For initial load, keep loading until we have photos from at least 4 different albums
        // or until we've loaded a reasonable amount
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
        
        setPhotos(photos)
      } else {
        // For pagination, load normal amount
        const data = await getPhotos(currentLastKey, 20)
        setPhotos(prev => {
          const existingIds = new Set(prev.map((p: Photo) => p.id))
          const newPhotos = data.photos.filter((p: Photo) => !existingIds.has(p.id))
          return [...prev, ...newPhotos]
        })
        currentLastKey = data.lastKey
        hasMorePhotos = !!data.lastKey
      }
      
      setLastKey(currentLastKey || null)
      setHasMore(hasMorePhotos)
    } catch (error) {
      console.error('Failed to load photos:', error)
      toast.error('Failed to load photos')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMorePhotos = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await loadPhotos(false)
  }

  const loadAlbumMetadata = async () => {
    try {
      const response = await getAlbums()
      const metadata = new Map<string, { 
        name: string; 
        photoCount: number;
        comments?: Array<{id: string; content: string; author: string; createdAt: string}>;
        reactions?: Array<{id: string; type: 'like' | 'love' | 'laugh'; author: string; createdAt: string}>;
      }>()
      
      response.albums.forEach((album: any) => {
        metadata.set(album.id, {
          name: album.name,
          photoCount: album.photoCount,
          comments: album.comments || [],
          reactions: album.reactions || []
        })
      })
      
      setAlbumMetadata(metadata)
    } catch (error) {
      console.error('Failed to load album metadata:', error)
    }
  }

  const refreshPhotos = async () => {
    setLoading(true)
    setLastKey(null)
    setHasMore(true)
    setShowAllAlbums(false)
    
    // Wait for album metadata to load first, then load photos
    // This ensures PhotoGroups are created with updated album data
    await loadAlbumMetadata()
    await loadPhotos(true)
  }

  // Initial data loading
  useEffect(() => {
    loadPhotos(true)
    loadAlbumMetadata()
  }, [])

  // Infinite scroll effect with throttling
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      if (throttleTimer) return
      
      throttleTimer = setTimeout(() => {
        if (window.innerHeight + document.documentElement.scrollTop 
            >= document.documentElement.offsetHeight - 1000) {
          loadMorePhotos()
        }
        throttleTimer = null
      }, 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (throttleTimer) clearTimeout(throttleTimer)
    }
  }, [loadingMore, hasMore, lastKey])

  // Get all unique tags and users
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    photos.forEach(photo => {
      photo.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [photos])

  const allUsers = useMemo(() => {
    const userSet = new Set<string>()
    photos.forEach(photo => {
      userSet.add(photo.uploadedBy)
    })
    return Array.from(userSet).sort()
  }, [photos])

  // Get filtered display groups
  const filteredDisplay = useMemo(() => {
    return getFilteredDisplay(
      photos, 
      selectedTags, 
      selectedUsers, 
      showAllAlbums, 
      albumMetadata, 
      hasMore
    )
  }, [photos, selectedTags, selectedUsers, showAllAlbums, albumMetadata, hasMore])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const toggleUser = (user: string) => {
    setSelectedUsers(prev => 
      prev.includes(user) 
        ? prev.filter(u => u !== user)
        : [...prev, user]
    )
  }

  const clearAllFilters = () => {
    setSelectedTags([])
    setSelectedUsers([])
  }

  return {
    // Data
    photos,
    filteredDisplay,
    allTags,
    allUsers,
    albumMetadata,
    
    // State
    loading,
    loadingMore,
    hasMore,
    showAllAlbums,
    selectedTags,
    selectedUsers,
    
    // Actions
    setShowAllAlbums,
    setLoadingMore,
    toggleTag,
    toggleUser,
    clearAllFilters,
    refreshPhotos,
    loadMorePhotos
  }
} 