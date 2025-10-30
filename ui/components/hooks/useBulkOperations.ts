import { useState } from 'react'
import { Photo } from '../utils/photoUtils'
import toast from 'react-hot-toast'
import JSZip from 'jszip'

interface ProgressState {
  isActive: boolean;
  completed: number;
  total: number;
  currentPhoto?: string;
}

export const useBulkOperations = (photos: Photo[], onUpdate?: () => void) => {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [deleteProgress, setDeleteProgress] = useState<ProgressState>({ 
    isActive: false, 
    completed: 0, 
    total: 0 
  })
  const [downloadProgress, setDownloadProgress] = useState<ProgressState>({ 
    isActive: false, 
    completed: 0, 
    total: 0 
  })

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }

  const selectAllPhotos = (allPhotoIds: string[]) => {
    setSelectedPhotos(new Set(allPhotoIds))
  }

  const clearSelection = () => {
    setSelectedPhotos(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}? This action cannot be undone.`
    )
    
    if (!confirmDelete) return

    const photoIds = Array.from(selectedPhotos)
    const totalPhotos = photoIds.length
    
    setDeleteProgress({
      isActive: true,
      completed: 0,
      total: totalPhotos
    })

    try {
      let completed = 0
      let failed = 0
      
      // Process photos in batches of 3 to avoid overwhelming the server
      const batchSize = 3
      for (let i = 0; i < photoIds.length; i += batchSize) {
        const batch = photoIds.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (photoId) => {
          try {
            const photo = photos.find(p => p.id === photoId)
            setDeleteProgress(prev => ({
              ...prev,
              currentPhoto: photo?.caption || `Photo ${completed + 1}`
            }))
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/photos/${photoId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]?.split(';')[0] || ''}`
              }
            })
            
            if (!response.ok) {
              throw new Error(`Failed to delete photo ${photoId}`)
            }
            
            completed++
            setDeleteProgress(prev => ({
              ...prev,
              completed: completed
            }))
            
            return { success: true, photoId }
          } catch (error) {
            failed++
            console.error(`Error deleting photo ${photoId}:`, error)
            return { success: false, photoId, error }
          }
        })
        
        await Promise.all(batchPromises)
      }
      
      setDeleteProgress({ isActive: false, completed: 0, total: 0 })
      clearSelection()
      
      if (onUpdate) {
        onUpdate()
      }
      
      if (failed === 0) {
        toast.success(`Successfully deleted ${completed} photo${completed > 1 ? 's' : ''}`)
      } else {
        toast.error(`Deleted ${completed} photo${completed > 1 ? 's' : ''}. Failed to delete ${failed} photo${failed > 1 ? 's' : ''}.`)
      }
    } catch (error) {
      console.error('Error during bulk delete:', error)
      setDeleteProgress({ isActive: false, completed: 0, total: 0 })
      toast.error('Failed to delete photos. Please try again.')
    }
  }

  const handleBulkDownload = async () => {
    if (selectedPhotos.size === 0) return
    
    const photoIds = Array.from(selectedPhotos)
    const totalPhotos = photoIds.length
    
    setDownloadProgress({
      isActive: true,
      completed: 0,
      total: totalPhotos
    })

    try {
      const zip = new JSZip()
      let completed = 0
      let failed = 0
      
      // Process photos in batches to avoid overwhelming the browser
      const batchSize = 3
      for (let i = 0; i < photoIds.length; i += batchSize) {
        const batch = photoIds.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (photoId) => {
          try {
            const photo = photos.find(p => p.id === photoId)
            if (!photo) throw new Error(`Photo ${photoId} not found`)
            
            setDownloadProgress(prev => ({
              ...prev,
              currentPhoto: photo.caption || `Photo ${completed + 1}`
            }))
            
            const response = await fetch(photo.originalUrl || photo.url)
            if (!response.ok) throw new Error(`Failed to download photo ${photoId}`)
            
            const blob = await response.blob()
            
            // Create a safe filename
            const timestamp = photo.takenAt ? new Date(photo.takenAt).toISOString().split('T')[0] : new Date(photo.uploadedAt).toISOString().split('T')[0]
            const uploader = photo.uploadedBy.split('@')[0]
            const caption = photo.caption ? `_${photo.caption.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}` : ''
            const filename = `${timestamp}_${uploader}${caption}_${photo.id.substring(0, 8)}.jpg`
            
            zip.file(filename, blob)
            
            completed++
            setDownloadProgress(prev => ({
              ...prev,
              completed: completed
            }))
            
            return { success: true, photoId }
          } catch (error) {
            failed++
            console.error(`Error downloading photo ${photoId}:`, error)
            return { success: false, photoId, error }
          }
        })
        
        await Promise.all(batchPromises)
      }
      
      if (completed > 0) {
        setDownloadProgress(prev => ({
          ...prev,
          currentPhoto: 'Creating zip file...'
        }))
        
        const content = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(content)
        const link = document.createElement('a')
        link.href = url
        link.download = `family_photos_${new Date().toISOString().split('T')[0]}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
      
      setDownloadProgress({ isActive: false, completed: 0, total: 0 })
      
      if (failed === 0) {
        toast.success(`Successfully downloaded ${completed} photo${completed > 1 ? 's' : ''}`)
      } else {
        toast.error(`Downloaded ${completed} photo${completed > 1 ? 's' : ''}. Failed to download ${failed} photo${failed > 1 ? 's' : ''}.`)
      }
    } catch (error) {
      console.error('Error during bulk download:', error)
      setDownloadProgress({ isActive: false, completed: 0, total: 0 })
      toast.error('Failed to download photos. Please try again.')
    }
  }

  const isOperationInProgress = deleteProgress.isActive || downloadProgress.isActive

  return {
    // State
    selectedPhotos,
    deleteProgress,
    downloadProgress,
    isOperationInProgress,
    
    // Actions
    togglePhotoSelection,
    selectAllPhotos,
    clearSelection,
    handleBulkDelete,
    handleBulkDownload
  }
} 