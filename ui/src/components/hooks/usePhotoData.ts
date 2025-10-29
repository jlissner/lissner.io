import { useState, useEffect, useMemo } from 'react'
import { Photo } from '../utils/photoUtils'
import { getFilteredDisplay } from '../utils/photoGrouping'
import toast from 'react-hot-toast'
import {
  AlbumMetadata,
  loadInitialPhotos,
  loadAdditionalPhotos,
  loadAlbumMetadata,
  extractUniqueTags,
  extractUniqueUsers,
  shouldLoadMorePhotos
} from '../../utils/photoDataUtils'

export const usePhotoData = () => {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastKey, setLastKey] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showAllAlbums, setShowAllAlbums] = useState(false)
  const [albumMetadata, setAlbumMetadata] = useState<Map<string, AlbumMetadata>>(new Map())



  const loadPhotos = async (reset = false) => {
    try {
      if (reset) {
        const result = await loadInitialPhotos()
        setPhotos(result.photos)
        setLastKey(result.lastKey)
        setHasMore(result.hasMore)
      } else {
        const result = await loadAdditionalPhotos(photos, lastKey)
        setPhotos(result.photos)
        setLastKey(result.lastKey)
        setHasMore(result.hasMore)
      }
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

  const loadAlbumMetadataData = async () => {
    try {
      const metadata = await loadAlbumMetadata()
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
    await loadAlbumMetadataData()
    await loadPhotos(true)
  }

  // Initial data loading
  useEffect(() => {
    loadPhotos(true)
    loadAlbumMetadataData()
  }, [])

  // Infinite scroll effect with throttling
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      if (throttleTimer) return
      
      throttleTimer = setTimeout(() => {
        if (shouldLoadMorePhotos()) {
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
  const allTags = useMemo(() => extractUniqueTags(photos), [photos])
  const allUsers = useMemo(() => extractUniqueUsers(photos), [photos])

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