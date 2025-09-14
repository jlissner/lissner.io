'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAlbumPhotos } from '@/ui/lib/api'
import { Photo, PhotoGroup } from '../utils/photoUtils'
import toast from 'react-hot-toast'

interface UseAlbumPhotosProps {
  group: PhotoGroup
}

export const useAlbumPhotos = ({ group }: UseAlbumPhotosProps) => {
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([])
  const [albumLoading, setAlbumLoading] = useState(false)
  const [albumLoadingMore, setAlbumLoadingMore] = useState(false)
  const [albumHasMore, setAlbumHasMore] = useState(true)
  const [albumLastKey, setAlbumLastKey] = useState<string | null>(null)

  const loadAlbumPhotos = useCallback(async () => {
    if (!group.albumId) return

    setAlbumLoading(true)
    try {
      const data = await getAlbumPhotos(group.albumId, undefined, 50)
      setAlbumPhotos(data.photos)
      setAlbumLastKey(data.lastKey)
      setAlbumHasMore(!!data.lastKey)
    } catch (error) {
      console.error('Failed to load album photos:', error)
      toast.error('Failed to load album photos')
    } finally {
      setAlbumLoading(false)
    }
  }, [group.albumId])

  const loadMoreAlbumPhotos = useCallback(async () => {
    console.log('loadMoreAlbumPhotos called:', {
      albumId: group.albumId,
      albumLastKey,
      albumLoadingMore,
      currentPhotosCount: albumPhotos.length
    })

    if (!group.albumId || !albumLastKey || albumLoadingMore) {
      console.log('Early return from loadMoreAlbumPhotos:', {
        noAlbumId: !group.albumId,
        noLastKey: !albumLastKey,
        alreadyLoading: albumLoadingMore
      })
      return
    }

    setAlbumLoadingMore(true)
    try {
      const data = await getAlbumPhotos(group.albumId, albumLastKey, 50)
      console.log('Loaded more photos:', {
        newPhotosCount: data.photos.length,
        newLastKey: data.lastKey,
        totalPhotosAfter: albumPhotos.length + data.photos.length
      })
      setAlbumPhotos(prev => [...prev, ...data.photos])
      setAlbumLastKey(data.lastKey)
      setAlbumHasMore(!!data.lastKey)
    } catch (error) {
      console.error('Failed to load more album photos:', error)
    } finally {
      setAlbumLoadingMore(false)
    }
  }, [group.albumId, albumLastKey, albumLoadingMore, albumPhotos.length])

  const refreshAlbumPhotos = useCallback(async () => {
    if (!group.albumId) return

    try {
      const data = await getAlbumPhotos(group.albumId, undefined, 100)
      setAlbumPhotos(data.photos)
    } catch (error) {
      console.error('Failed to refresh album photos:', error)
    }
  }, [group.albumId])

  // Load initial photos when component mounts or albumId changes
  useEffect(() => {
    loadAlbumPhotos()
  }, [loadAlbumPhotos])

  return {
    albumPhotos,
    albumLoading,
    albumLoadingMore,
    albumHasMore,
    albumLastKey,
    loadAlbumPhotos,
    loadMoreAlbumPhotos,
    refreshAlbumPhotos,
    setAlbumPhotos
  }
}
