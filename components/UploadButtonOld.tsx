'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { uploadPhotoWithProgress, getAlbums } from '@/lib/api'
import toast from 'react-hot-toast'
import { XMarkIcon } from '@heroicons/react/24/outline'

// Generate a unique ID for upload sessions
const generateUploadSessionId = () => {
  return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface FileUpload {
  file: File
  caption: string
  tags: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface Album {
  id: string
  name: string
  uploadedBy: string
  createdAt: string
  photoCount: number
  photos: Array<{
    id: string
    url: string
    caption: string
  }>
}

export default function UploadButton() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([])
  const [globalTags, setGlobalTags] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [albums, setAlbums] = useState<Album[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string>('new')
  const [newAlbumName, setNewAlbumName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const response = await getAlbums()
        setAlbums(response.albums || [])
      } catch (error) {
        console.error('Error loading albums:', error)
      }
    }
    
    if (showModal) {
      loadAlbums()
    }
  }, [showModal])

  if (!user) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      toast.error('Please select image files')
      return
    }

    if (imageFiles.length !== files.length) {
      toast.error('Some files were skipped (only images are allowed)')
    }

    const newUploads: FileUpload[] = imageFiles.map(file => ({
      file,
      caption: '',
      tags: '',
      progress: 0,
      status: 'pending'
    }))

    setFileUploads(newUploads)
    setShowModal(true)
  }

  const updateFileUpload = (index: number, updates: Partial<FileUpload>) => {
    setFileUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, ...updates } : upload
    ))
  }

  const processTags = (tagString: string): string[] => {
    if (!tagString.trim()) return []
    
    return tagString
      .split(/[,\s]+/)
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .map(tag => tag.replace(/^#/, '')) // Remove # if present
  }

  const handleUpload = async () => {
    if (fileUploads.length === 0) return

    // Validate album selection
    if (selectedAlbum === 'new' && !newAlbumName.trim()) {
      toast.error('Please enter a name for the new album')
      return
    }

    setIsUploading(true)
    
    // Determine upload session ID and album name
    let uploadSessionId: string
    let albumName: string
    
    if (selectedAlbum === 'new') {
      // Create new album
      uploadSessionId = generateUploadSessionId()
      albumName = newAlbumName.trim()
    } else {
      // Use existing album
      uploadSessionId = selectedAlbum
      const existingAlbum = albums.find(a => a.id === selectedAlbum)
      albumName = existingAlbum?.name || 'Unknown Album'
    }
    
    console.log(`Starting upload session: ${uploadSessionId} with ${fileUploads.length} photos to album: ${albumName}`)
    
    // Process global tags once
    const globalTagsArray = processTags(globalTags)
    
    // Upload all files concurrently
    const uploadPromises = fileUploads.map(async (upload, index) => {
      try {
        updateFileUpload(index, { status: 'uploading', progress: 0 })
        
        // Combine global tags with individual tags
        const individualTagsArray = processTags(upload.tags)
        const allTags = Array.from(new Set([...globalTagsArray, ...individualTagsArray])) // Remove duplicates
        
        await uploadPhotoWithProgress(
          upload.file, 
          upload.caption || undefined,
          allTags,
          (progress) => updateFileUpload(index, { progress }),
          uploadSessionId, // Pass the session ID to group photos together
          albumName // Pass the album name
        )
        
        updateFileUpload(index, { status: 'success', progress: 100 })
      } catch (error: any) {
        updateFileUpload(index, { 
          status: 'error', 
          error: error.message || 'Upload failed' 
        })
      }
    })

    await Promise.all(uploadPromises)
    
    const successCount = fileUploads.filter(u => u.status === 'success').length
    const errorCount = fileUploads.filter(u => u.status === 'error').length
    
    if (successCount > 0) {
      toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully!`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} photo${errorCount > 1 ? 's' : ''} failed to upload`)
    }
    
    setIsUploading(false)
    
    // Close modal after a short delay if all uploads completed
    if (errorCount === 0) {
      setTimeout(() => {
        setShowModal(false)
        setFileUploads([])
        setGlobalTags('')
        setSelectedAlbum('new')
        setNewAlbumName('')
        window.location.reload()
      }, 3000) // Increased delay to ensure DB consistency
    }
  }

  const handleCancel = () => {
    setShowModal(false)
    setFileUploads([])
    setGlobalTags('')
    setSelectedAlbum('new')
    setNewAlbumName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setFileUploads(prev => prev.filter((_, i) => i !== index))
  }

  const updateCaption = (index: number, caption: string) => {
    updateFileUpload(index, { caption })
  }

  const updateTags = (index: number, tags: string) => {
    updateFileUpload(index, { tags })
  }

  const overallProgress = fileUploads.length > 0 
    ? Math.round(fileUploads.reduce((sum, upload) => sum + upload.progress, 0) / fileUploads.length)
    : 0

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Photos ({fileUploads.length})
              </h3>
              {isUploading && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Overall Progress</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${overallProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Album Selection and Global Tags Section */}
            <div className="p-6 border-b bg-gray-50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Album
                  </label>
                  <select
                    value={selectedAlbum}
                    onChange={(e) => setSelectedAlbum(e.target.value)}
                    disabled={isUploading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 disabled:bg-gray-100"
                  >
                    <option value="new">Create New Album</option>
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.name} ({album.photoCount} photos)
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedAlbum === 'new' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Album Name
                    </label>
                    <input
                      type="text"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      placeholder="Enter album name..."
                      disabled={isUploading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-500 disabled:bg-gray-100"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Global Tags (applied to all photos)
                  </label>
                  <input
                    type="text"
                    value={globalTags}
                    onChange={(e) => setGlobalTags(e.target.value)}
                    placeholder="family, vacation, 2024 (separate with commas or spaces)"
                    disabled={isUploading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate tags with commas or spaces. These will be added to all photos.
                  </p>
                  {globalTags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {processTags(globalTags).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full group hover:bg-primary-200 transition-colors"
                        >
                          #{tag}
                        <button
                          onClick={() => {
                            const tagList = processTags(globalTags)
                            tagList.splice(index, 1)
                            setGlobalTags(tagList.join(', '))
                          }}
                          className="ml-1 text-primary-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove tag"
                          disabled={isUploading}
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {fileUploads.map((upload, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-20 h-20 relative">
                      <img
                        src={URL.createObjectURL(upload.file)}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {upload.file.name}
                        </p>
                        {upload.status === 'pending' && (
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      
                      <input
                        type="text"
                        value={upload.caption}
                        onChange={(e) => updateCaption(index, e.target.value)}
                        placeholder="Add caption (optional)"
                        disabled={upload.status !== 'pending'}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-500 disabled:bg-gray-100"
                      />
                      
                      <input
                        type="text"
                        value={upload.tags}
                        onChange={(e) => updateTags(index, e.target.value)}
                        placeholder="Additional tags for this photo (optional)"
                        disabled={upload.status !== 'pending'}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-500 disabled:bg-gray-100"
                      />
                      {upload.tags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {processTags(upload.tags).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full group hover:bg-blue-200 transition-colors"
                            >
                              #{tag}
                              <button
                                onClick={() => {
                                  const tagList = processTags(upload.tags)
                                  tagList.splice(tagIndex, 1)
                                  updateTags(index, tagList.join(', '))
                                }}
                                className="ml-1 text-blue-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove tag"
                                disabled={upload.status !== 'pending'}
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {upload.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Uploading...</span>
                            <span>{upload.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-primary-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${upload.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {upload.status === 'success' && (
                        <div className="mt-2 text-green-600 text-sm flex items-center">
                          <span className="mr-1">✓</span>
                          Upload successful
                        </div>
                      )}
                      
                      {upload.status === 'error' && (
                        <div className="mt-2 text-red-600 text-sm flex items-center">
                          <span className="mr-1">✗</span>
                          {upload.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 btn-secondary"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || fileUploads.length === 0}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : `Upload ${fileUploads.length} Photo${fileUploads.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 