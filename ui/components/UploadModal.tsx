'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface FileUpload {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface UploadModalProps {
  isOpen: boolean
  fileUploads: FileUpload[]
  globalTags: string
  isUploading: boolean
  onGlobalTagsChange: (tags: string) => void
  onStartUpload: () => void
  onCancel: () => void
}

export const UploadModal = ({
  isOpen,
  fileUploads,
  globalTags,
  isUploading,
  onGlobalTagsChange,
  onStartUpload,
  onCancel
}: UploadModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
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

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Global Tags Input */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 bg-white placeholder-gray-500"
            />
          </div>

          {/* File Upload Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Files to Upload ({fileUploads.length})</h3>
            {fileUploads.map((upload) => (
              <div key={upload.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate flex-1 mr-4 text-gray-900">
                    {upload.file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(upload.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      upload.status === 'completed' 
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

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${
                    upload.status === 'completed' 
                      ? 'text-green-600' 
                      : upload.status === 'error' 
                      ? 'text-red-600' 
                      : upload.status === 'uploading'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}>
                    {upload.status === 'pending' && 'Ready to upload'}
                    {upload.status === 'uploading' && 'Uploading...'}
                    {upload.status === 'completed' && 'Upload complete'}
                    {upload.status === 'error' && `Error: ${upload.error}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {upload.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
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
