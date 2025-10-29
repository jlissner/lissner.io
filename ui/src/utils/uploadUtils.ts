/**
 * Upload utility functions
 * All functions in this file are covered by tests in components/__tests__/upload-utils.test.ts
 */

/**
 * Generate a unique ID for upload sessions
 */
export function generateUploadSessionId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Process tag string into an array of normalized tags
 * - Splits by comma and/or space
 * - Converts to lowercase
 * - Removes hash symbols
 * - Trims whitespace
 * - Filters out empty tags
 */
export function processTags(tagString: string): string[] {
  if (!tagString.trim()) return []
  
  return tagString
    .split(/[,\s]+/)
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0)
    .map(tag => tag.replace(/^#/, '')) // Remove # if present
}

/**
 * Check if a file is an image based on its MIME type
 */
export function isImageFile(file: { type: string }): boolean {
  return file.type.startsWith('image/')
}

/**
 * Filter an array of files to only include image files
 */
export function filterImageFiles(files: File[]): File[] {
  return files.filter(isImageFile)
}

/**
 * File upload state and progress types
 */
export interface FileUpload {
  file: File
  caption: string
  tags: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

/**
 * Update a specific file upload in an array by index
 */
export function updateFileUpload(
  uploads: FileUpload[], 
  index: number, 
  updates: Partial<FileUpload>
): FileUpload[] {
  return uploads.map((upload, i) => 
    i === index ? { ...upload, ...updates } : upload
  )
}

/**
 * Calculate overall progress percentage from all uploads
 */
export function calculateOverallProgress(uploads: FileUpload[]): number {
  if (uploads.length === 0) return 0
  return Math.round(uploads.reduce((sum, upload) => sum + upload.progress, 0) / uploads.length)
}

/**
 * Count uploads by status
 */
export function countUploadsByStatus(
  uploads: FileUpload[], 
  status: FileUpload['status']
): number {
  return uploads.filter(u => u.status === status).length
}

/**
 * Album interface for type safety
 */
export interface Album {
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
