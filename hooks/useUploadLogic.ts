'use client'

import { useState, useCallback } from 'react'
import { uploadPhotoWithProgress } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { 
  FileUpload, 
  generateUploadSessionId,
  processTags,
  updateFileUpload,
  countUploadsByStatus
} from '../utils/uploadUtils'
import toast from 'react-hot-toast'

interface UseUploadLogicProps {
  onUploadComplete?: () => void
}

export const useUploadLogic = ({ onUploadComplete }: UseUploadLogicProps = {}) => {
  const { user } = useAuth()
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([])
  const [globalTags, setGlobalTags] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const updateFileUploadState = useCallback((index: number, updates: Partial<FileUpload>) => {
    setFileUploads(prev => updateFileUpload(prev, index, updates))
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const newUploads: FileUpload[] = files.map(file => ({
      file,
      caption: '',
      tags: '',
      progress: 0,
      status: 'pending' as const
    }))
    setFileUploads(newUploads)
  }, [])

  const removeFile = useCallback((index: number) => {
    setFileUploads(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateCaption = useCallback((index: number, caption: string) => {
    updateFileUploadState(index, { caption })
  }, [updateFileUploadState])

  const updateTags = useCallback((index: number, tags: string) => {
    updateFileUploadState(index, { tags })
  }, [updateFileUploadState])

  const startUpload = useCallback(async (
    uploadSessionId: string,
    albumName: string
  ): Promise<{ success: number; errors: number }> => {
    if (!user?.email || fileUploads.length === 0) {
      return { success: 0, errors: 0 }
    }

    setIsUploading(true)
    
    console.log(`Starting upload session: ${uploadSessionId} with ${fileUploads.length} photos to album: ${albumName}`)
    
    // Process global tags once
    const globalTagsArray = processTags(globalTags)
    
    // Upload all files concurrently
    const uploadPromises = fileUploads.map(async (upload, index) => {
      try {
        updateFileUploadState(index, { status: 'uploading', progress: 0 })
        
        // Combine global tags with individual tags
        const individualTagsArray = processTags(upload.tags)
        const allTags = Array.from(new Set([...globalTagsArray, ...individualTagsArray])) // Remove duplicates
        
        await uploadPhotoWithProgress(
          upload.file, 
          upload.caption || undefined,
          allTags,
          (progress) => updateFileUploadState(index, { progress }),
          uploadSessionId, // Pass the session ID to group photos together
          albumName // Pass the album name
        )
        
        updateFileUploadState(index, { status: 'success', progress: 100 })
      } catch (error: any) {
        updateFileUploadState(index, { 
          status: 'error', 
          error: error.message || 'Upload failed' 
        })
      }
    })

    await Promise.all(uploadPromises)
    
    const successCount = countUploadsByStatus(fileUploads, 'success')
    const errorCount = countUploadsByStatus(fileUploads, 'error')
    
    if (successCount > 0) {
      toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully!`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} photo${errorCount > 1 ? 's' : ''} failed to upload`)
    }
    
    setIsUploading(false)
    
    // Call completion callback if provided
    if (onUploadComplete) {
      onUploadComplete()
    }

    return { success: successCount, errors: errorCount }
  }, [user?.email, fileUploads, globalTags, updateFileUploadState, onUploadComplete])

  const resetUpload = useCallback(() => {
    setFileUploads([])
    setGlobalTags('')
    setIsUploading(false)
  }, [])

  return {
    // State
    fileUploads,
    globalTags,
    isUploading,
    
    // Actions
    addFiles,
    removeFile,
    updateCaption,
    updateTags,
    setGlobalTags,
    startUpload,
    resetUpload,
  }
}
