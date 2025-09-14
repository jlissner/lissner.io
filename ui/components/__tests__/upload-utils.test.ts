import { describe, it, expect } from 'vitest'
import {
  generateUploadSessionId,
  processTags,
  isImageFile,
  filterImageFiles,
  updateFileUpload,
  calculateOverallProgress,
  countUploadsByStatus,
  type FileUpload
} from '../../utils/uploadUtils'

describe('Upload Utilities', () => {
  describe('processTags', () => {
    it('should return empty array for empty string', () => {
      expect(processTags('')).toEqual([])
      expect(processTags('   ')).toEqual([])
    })

    it('should split tags by comma', () => {
      expect(processTags('tag1, tag2, tag3')).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should split tags by spaces', () => {
      expect(processTags('tag1 tag2 tag3')).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should convert tags to lowercase', () => {
      expect(processTags('TAG1, Tag2, tAg3')).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should remove hash symbols', () => {
      expect(processTags('#tag1, #tag2, tag3')).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should trim whitespace', () => {
      expect(processTags('  tag1  ,  tag2  ,  tag3  ')).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should filter out empty tags', () => {
      expect(processTags('tag1,, tag2,   , tag3')).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should handle mixed separators', () => {
      expect(processTags('tag1, tag2 tag3,tag4   tag5')).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'tag5'])
    })

    it('should handle complex input', () => {
      expect(processTags('#Vacation, family 2024,  #SUMMER ,beach')).toEqual(['vacation', 'family', '2024', 'summer', 'beach'])
    })
  })

  describe('generateUploadSessionId', () => {
    it('should generate a string starting with "upload-"', () => {
      const id = generateUploadSessionId()
      expect(id).toMatch(/^upload-/)
    })

    it('should generate unique IDs', () => {
      const id1 = generateUploadSessionId()
      const id2 = generateUploadSessionId()
      expect(id1).not.toBe(id2)
    })

    it('should follow the expected format', () => {
      const id = generateUploadSessionId()
      expect(id).toMatch(/^upload-\d+-[a-z0-9]+$/)
    })
  })
})

describe('File Validation', () => {
  describe('isImageFile', () => {
    it('should identify image files correctly', () => {
      expect(isImageFile({ type: 'image/jpeg' })).toBe(true)
      expect(isImageFile({ type: 'image/png' })).toBe(true)
      expect(isImageFile({ type: 'image/gif' })).toBe(true)
      expect(isImageFile({ type: 'image/webp' })).toBe(true)
      expect(isImageFile({ type: 'text/plain' })).toBe(false)
      expect(isImageFile({ type: 'application/pdf' })).toBe(false)
      expect(isImageFile({ type: 'video/mp4' })).toBe(false)
    })
  })

  describe('filterImageFiles', () => {
    it('should filter array to only include image files', () => {
      const files = [
        new File([''], 'image.jpg', { type: 'image/jpeg' }),
        new File([''], 'document.pdf', { type: 'application/pdf' }),
        new File([''], 'photo.png', { type: 'image/png' }),
        new File([''], 'video.mp4', { type: 'video/mp4' })
      ]

      const imageFiles = filterImageFiles(files)
      expect(imageFiles).toHaveLength(2)
      expect(imageFiles[0].name).toBe('image.jpg')
      expect(imageFiles[1].name).toBe('photo.png')
    })

    it('should return empty array when no image files', () => {
      const files = [
        new File([''], 'document.pdf', { type: 'application/pdf' }),
        new File([''], 'video.mp4', { type: 'video/mp4' })
      ]

      const imageFiles = filterImageFiles(files)
      expect(imageFiles).toHaveLength(0)
    })

    it('should return all files when all are images', () => {
      const files = [
        new File([''], 'image1.jpg', { type: 'image/jpeg' }),
        new File([''], 'image2.png', { type: 'image/png' })
      ]

      const imageFiles = filterImageFiles(files)
      expect(imageFiles).toHaveLength(2)
    })
  })
})

describe('Upload State Management', () => {
  describe('updateFileUpload', () => {
    it('should update specific file upload by index', () => {
      const initialUploads: FileUpload[] = [
        {
          file: new File([''], 'test1.jpg', { type: 'image/jpeg' }),
          caption: '',
          tags: '',
          progress: 0,
          status: 'pending'
        },
        {
          file: new File([''], 'test2.jpg', { type: 'image/jpeg' }),
          caption: '',
          tags: '',
          progress: 0,
          status: 'pending'
        }
      ]

      const updated = updateFileUpload(initialUploads, 0, { 
        status: 'uploading', 
        progress: 50 
      })

      expect(updated[0].status).toBe('uploading')
      expect(updated[0].progress).toBe(50)
      expect(updated[1].status).toBe('pending')
      expect(updated[1].progress).toBe(0)
    })

    it('should not mutate original array', () => {
      const initialUploads: FileUpload[] = [
        {
          file: new File([''], 'test1.jpg'),
          caption: '',
          tags: '',
          progress: 0,
          status: 'pending'
        }
      ]

      const updated = updateFileUpload(initialUploads, 0, { status: 'uploading' })

      expect(updated).not.toBe(initialUploads)
      expect(initialUploads[0].status).toBe('pending')
      expect(updated[0].status).toBe('uploading')
    })

    it('should handle out of bounds index gracefully', () => {
      const initialUploads: FileUpload[] = [
        {
          file: new File([''], 'test1.jpg'),
          caption: '',
          tags: '',
          progress: 0,
          status: 'pending'
        }
      ]

      const updated = updateFileUpload(initialUploads, 5, { status: 'uploading' })

      expect(updated).toHaveLength(1)
      expect(updated[0].status).toBe('pending')
    })
  })

  describe('calculateOverallProgress', () => {
    it('should calculate overall progress correctly', () => {
      const uploads: FileUpload[] = [
        { file: new File([''], 'test1.jpg'), caption: '', tags: '', progress: 100, status: 'success' },
        { file: new File([''], 'test2.jpg'), caption: '', tags: '', progress: 50, status: 'uploading' },
        { file: new File([''], 'test3.jpg'), caption: '', tags: '', progress: 0, status: 'pending' }
      ]

      expect(calculateOverallProgress(uploads)).toBe(50) // (100 + 50 + 0) / 3 = 50
    })

    it('should return 0 for empty array', () => {
      expect(calculateOverallProgress([])).toBe(0)
    })

    it('should round to nearest integer', () => {
      const uploads: FileUpload[] = [
        { file: new File([''], 'test1.jpg'), caption: '', tags: '', progress: 33, status: 'uploading' },
        { file: new File([''], 'test2.jpg'), caption: '', tags: '', progress: 33, status: 'uploading' }
      ]

      expect(calculateOverallProgress(uploads)).toBe(33) // 33% rounded
    })
  })

  describe('countUploadsByStatus', () => {
    it('should count uploads by status correctly', () => {
      const uploads: FileUpload[] = [
        { file: new File([''], 'test1.jpg'), caption: '', tags: '', progress: 100, status: 'success' },
        { file: new File([''], 'test2.jpg'), caption: '', tags: '', progress: 100, status: 'success' },
        { file: new File([''], 'test3.jpg'), caption: '', tags: '', progress: 0, status: 'error', error: 'Failed' },
        { file: new File([''], 'test4.jpg'), caption: '', tags: '', progress: 50, status: 'uploading' },
      ]

      expect(countUploadsByStatus(uploads, 'success')).toBe(2)
      expect(countUploadsByStatus(uploads, 'error')).toBe(1)
      expect(countUploadsByStatus(uploads, 'uploading')).toBe(1)
      expect(countUploadsByStatus(uploads, 'pending')).toBe(0)
    })

    it('should return 0 for empty array', () => {
      expect(countUploadsByStatus([], 'success')).toBe(0)
    })

    it('should return 0 when no matches found', () => {
      const uploads: FileUpload[] = [
        { file: new File([''], 'test1.jpg'), caption: '', tags: '', progress: 0, status: 'pending' }
      ]

      expect(countUploadsByStatus(uploads, 'success')).toBe(0)
    })
  })
})
