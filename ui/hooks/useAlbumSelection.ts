'use client'

import { useState, useEffect } from 'react'
import { getAlbums } from '@/ui/lib/api'
import { Album } from '../utils/uploadUtils'

export const useAlbumSelection = () => {
  const [albums, setAlbums] = useState<Album[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string>('new')
  const [newAlbumName, setNewAlbumName] = useState('')
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false)

  const loadAlbums = async () => {
    setIsLoadingAlbums(true)
    try {
      const response = await getAlbums()
      setAlbums(response.albums || [])
    } catch (error) {
      console.error('Error loading albums:', error)
    } finally {
      setIsLoadingAlbums(false)
    }
  }

  // Load albums when needed
  useEffect(() => {
    loadAlbums()
  }, [])

  const getSelectedAlbumInfo = () => {
    if (selectedAlbum === 'new') {
      return {
        isNewAlbum: true,
        albumName: newAlbumName.trim(),
        uploadSessionId: null, // Will be generated during upload
      }
    } else {
      const existingAlbum = albums.find(a => a.id === selectedAlbum)
      return {
        isNewAlbum: false,
        albumName: existingAlbum?.name || 'Unknown Album',
        uploadSessionId: selectedAlbum,
      }
    }
  }

  const validateAlbumSelection = (): { isValid: boolean; error?: string } => {
    if (selectedAlbum === 'new' && !newAlbumName.trim()) {
      return { isValid: false, error: 'Please enter a name for the new album' }
    }
    return { isValid: true }
  }

  const resetSelection = () => {
    setSelectedAlbum('new')
    setNewAlbumName('')
  }

  return {
    // State
    albums,
    selectedAlbum,
    newAlbumName,
    isLoadingAlbums,
    
    // Actions
    setSelectedAlbum,
    setNewAlbumName,
    loadAlbums,
    resetSelection,
    
    // Computed
    getSelectedAlbumInfo,
    validateAlbumSelection,
  }
}
