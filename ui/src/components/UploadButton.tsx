'use client'

import { useRef } from 'react'
import { useAuth } from '../lib/auth-context'
import { useUploadLogic } from '../hooks/useUploadLogic'
import { useAlbumSelection } from '../hooks/useAlbumSelection'
import { UploadModalContent } from './upload/UploadModalContent'
import { 
  filterImageFiles, 
  generateUploadSessionId
} from '../utils/uploadUtils'
import toast from 'react-hot-toast'

export default function UploadButton() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadLogic = useUploadLogic({
    onUploadComplete: () => {
      // Close modal after successful upload
      setTimeout(() => {
        albumSelection.resetSelection()
        uploadLogic.resetUpload()
        window.location.reload()
      }, 3000)
    }
  })

  const albumSelection = useAlbumSelection()

  // Don't render if user is not authenticated
  if (!user) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = filterImageFiles(files)
    
    if (imageFiles.length === 0) {
      toast.error('Please select image files')
      return
    }

    if (imageFiles.length !== files.length) {
      toast.error('Some files were skipped (only images are allowed)')
    }

    uploadLogic.addFiles(imageFiles)
  }

  const handleStartUpload = async () => {
    const validation = albumSelection.validateAlbumSelection()
    if (!validation.isValid) {
      toast.error(validation.error!)
      return
    }

    const albumInfo = albumSelection.getSelectedAlbumInfo()
    const uploadSessionId = albumInfo.isNewAlbum 
      ? generateUploadSessionId() 
      : albumInfo.uploadSessionId!

    const result = await uploadLogic.startUpload(uploadSessionId, albumInfo.albumName)
    
    // Close modal if all uploads were successful
    if (result.errors === 0) {
      // The onUploadComplete callback will handle cleanup
    }
  }

  const handleCancel = () => {
    uploadLogic.resetUpload()
    albumSelection.resetSelection()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const showModal = uploadLogic.fileUploads.length > 0

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="btn-primary"
      >
        📸 Upload Photos
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {showModal && (
        <UploadModalContent
          fileUploads={uploadLogic.fileUploads}
          globalTags={uploadLogic.globalTags}
          albums={albumSelection.albums}
          selectedAlbum={albumSelection.selectedAlbum}
          newAlbumName={albumSelection.newAlbumName}
          isUploading={uploadLogic.isUploading}
          isLoadingAlbums={albumSelection.isLoadingAlbums}
          onGlobalTagsChange={uploadLogic.setGlobalTags}
          onAlbumChange={albumSelection.setSelectedAlbum}
          onNewAlbumNameChange={albumSelection.setNewAlbumName}
          onCaptionChange={uploadLogic.updateCaption}
          onTagsChange={uploadLogic.updateTags}
          onRemoveFile={uploadLogic.removeFile}
          onStartUpload={handleStartUpload}
          onCancel={handleCancel}
        />
      )}
    </>
  )
}
