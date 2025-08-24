'use client'

import { useState, useRef, useCallback } from 'react'
import { uploadPhotoWithProgress, generateUploadSessionId } from '../utils/photoUtils'
import { useAuth } from '@/lib/auth-context'
import toast from 'react-hot-toast'

interface FileUpload {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface UseFileUploadProps {
  albumId: string
  onUploadComplete?: () => void
}

export const useFileUpload = ({ albumId, onUploadComplete }: UseFileUploadProps) => {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([])
  const [globalTags, setGlobalTags] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const newUploads: FileUpload[] = files.map(file => ({
      file,
      id: generateUploadSessionId(),
      progress: 0,
      status: 'pending' as const
    }))

    setFileUploads(newUploads)
    setShowUploadModal(true)
  }, [])

  const startUpload = useCallback(async () => {
    if (!user?.email || fileUploads.length === 0) return

    setIsUploading(true)

    try {
      for (const upload of fileUploads) {
        setFileUploads(prev => 
          prev.map(u => u.id === upload.id ? { ...u, status: 'uploading' as const } : u)
        )

        try {
          await uploadPhotoWithProgress(
            upload.file,
            user.email,
            albumId,
            globalTags.split(',').map(tag => tag.trim()).filter(Boolean),
            (progress) => {
              setFileUploads(prev => 
                prev.map(u => u.id === upload.id ? { ...u, progress } : u)
              )
            }
          )

          setFileUploads(prev => 
            prev.map(u => u.id === upload.id ? { ...u, status: 'completed' as const, progress: 100 } : u)
          )
        } catch (error) {
          console.error('Upload failed:', error)
          setFileUploads(prev => 
            prev.map(u => u.id === upload.id ? { 
              ...u, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed'
            } : u)
          )
        }
      }

      const successCount = fileUploads.filter(u => u.status === 'completed').length
      toast.success(`Uploaded ${successCount} photo(s) successfully!`)
      
      // Call the completion callback
      if (onUploadComplete) {
        onUploadComplete()
      }

      // Reset upload state
      setShowUploadModal(false)
      setFileUploads([])
      setGlobalTags('')
    } catch (error) {
      console.error('Upload process failed:', error)
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [user?.email, fileUploads, albumId, globalTags, onUploadComplete])

  const cancelUpload = useCallback(() => {
    setShowUploadModal(false)
    setFileUploads([])
    setGlobalTags('')
  }, [])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return {
    // State
    showUploadModal,
    fileUploads,
    globalTags,
    isUploading,
    fileInputRef,
    
    // Actions
    handleFileSelect,
    startUpload,
    cancelUpload,
    openFileDialog,
    setGlobalTags,
    setShowUploadModal
  }
}
