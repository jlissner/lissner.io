'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { FileUpload, Album, calculateOverallProgress } from '../../utils/uploadUtils'

interface UploadModalContentProps {
  fileUploads: FileUpload[]
  globalTags: string
  albums: Album[]
  selectedAlbum: string
  newAlbumName: string
  isUploading: boolean
  isLoadingAlbums: boolean
  onGlobalTagsChange: (tags: string) => void
  onAlbumChange: (albumId: string) => void
  onNewAlbumNameChange: (name: string) => void
  onCaptionChange: (index: number, caption: string) => void
  onTagsChange: (index: number, tags: string) => void
  onRemoveFile: (index: number) => void
  onStartUpload: () => void
  onCancel: () => void
}

export const UploadModalContent = ({
  fileUploads,
  globalTags,
  albums,
  selectedAlbum,
  newAlbumName,
  isUploading,
  isLoadingAlbums,
  onGlobalTagsChange,
  onAlbumChange,
  onNewAlbumNameChange,
  onCaptionChange,
  onTagsChange,
  onRemoveFile,
  onStartUpload,
  onCancel
}: UploadModalContentProps) => {
  const overallProgress = calculateOverallProgress(fileUploads)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Upload Photos</h2>
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Album Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Album
            </label>
            <select
              value={selectedAlbum}
              onChange={(e) => onAlbumChange(e.target.value)}
              disabled={isUploading || isLoadingAlbums}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 bg-white"
            >
              <option value="new">Create New Album</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name} ({album.photoCount} photos)
                </option>
              ))}
            </select>
            
            {selectedAlbum === 'new' && (
              <input
                type="text"
                value={newAlbumName}
                onChange={(e) => onNewAlbumNameChange(e.target.value)}
                placeholder="Enter album name..."
                disabled={isUploading}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 bg-white placeholder-gray-500"
              />
            )}
          </div>

          {/* Global Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add tags to all photos (comma-separated)
            </label>
            <input
              type="text"
              value={globalTags}
              onChange={(e) => onGlobalTagsChange(e.target.value)}
              placeholder="vacation, family, 2024"
              disabled={isUploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 bg-white placeholder-gray-500"
            />
          </div>

          {/* File List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Files to Upload ({fileUploads.length})</h3>
            {fileUploads.map((upload, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate text-gray-900">
                        {upload.file.name}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {(upload.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        {!isUploading && (
                          <button
                            onClick={() => onRemoveFile(index)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          upload.status === 'success' 
                            ? 'bg-green-500' 
                            : upload.status === 'error' 
                            ? 'bg-red-500' 
                            : upload.status === 'uploading'
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        }`}
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${
                        upload.status === 'success' 
                          ? 'text-green-600' 
                          : upload.status === 'error' 
                          ? 'text-red-600' 
                          : upload.status === 'uploading'
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`}>
                        {upload.status === 'pending' && 'Ready to upload'}
                        {upload.status === 'uploading' && 'Uploading...'}
                        {upload.status === 'success' && 'Upload complete'}
                        {upload.status === 'error' && `Error: ${upload.error}`}
                      </span>
                      <span className="text-gray-500">
                        {upload.progress}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Caption and tags inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={upload.caption}
                    onChange={(e) => onCaptionChange(index, e.target.value)}
                    placeholder="Add a caption..."
                    disabled={isUploading}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 bg-white placeholder-gray-500"
                  />
                  <input
                    type="text"
                    value={upload.tags}
                    onChange={(e) => onTagsChange(index, e.target.value)}
                    placeholder="nature, sunset"
                    disabled={isUploading}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 bg-white placeholder-gray-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Overall Progress */}
          {isUploading && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Overall Progress</span>
                <span className="text-sm text-blue-700">{overallProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onStartUpload}
            disabled={isUploading || fileUploads.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : `Upload ${fileUploads.length} Photo(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}
