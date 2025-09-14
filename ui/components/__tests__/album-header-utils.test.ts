import { describe, it, expect } from 'vitest'
import {
  formatPhotoCountText,
  shouldShowAlbumName,
  getAlbumBadgeText,
  formatHeaderSubtitle
} from '../../utils/albumHeaderUtils'

/**
 * Tests for AlbumHeader utility functions and calculations
 * This tests the logic used to determine photo counts and display text
 */

describe('AlbumHeader Utils', () => {
  describe('formatPhotoCountText', () => {
    it('should show estimated count when potentially incomplete', () => {
      const result = formatPhotoCountText(20, 15, 25, true)
      
      expect(result).toBe('15 of 25 photos')
    })

    it('should show total when not potentially incomplete', () => {
      const result = formatPhotoCountText(20, 15, 25, false)
      
      expect(result).toBe('25 photos')
    })

    it('should use totalPhotos when no estimated count', () => {
      const result = formatPhotoCountText(20, 15, undefined, false)
      
      expect(result).toBe('20 photos')
    })

    it('should handle estimated count equal to photos to show', () => {
      const result = formatPhotoCountText(15, 15, 15, true)
      
      expect(result).toBe('15 photos')
    })

    it('should handle estimated count less than photos to show', () => {
      const result = formatPhotoCountText(20, 15, 10, true)
      
      expect(result).toBe('10 photos')
    })

    it('should handle single photo', () => {
      const result = formatPhotoCountText(1, 1, 1, false)
      
      expect(result).toBe('1 photos')
    })

    it('should handle zero photos', () => {
      const result = formatPhotoCountText(0, 0, 0, false)
      
      expect(result).toBe('0 photos')
    })
  })

  describe('shouldShowAlbumName', () => {
    it('should return true when both albumName and albumId are provided', () => {
      const result = shouldShowAlbumName('Summer Vacation', 'album-123')
      
      expect(result).toBe(true)
    })

    it('should return false when albumName is missing', () => {
      const result = shouldShowAlbumName(undefined, 'album-123')
      
      expect(result).toBe(false)
    })

    it('should return false when albumId is missing', () => {
      const result = shouldShowAlbumName('Summer Vacation', undefined)
      
      expect(result).toBe(false)
    })

    it('should return false when both are missing', () => {
      const result = shouldShowAlbumName(undefined, undefined)
      
      expect(result).toBe(false)
    })

    it('should return false when albumName is empty string', () => {
      const result = shouldShowAlbumName('', 'album-123')
      
      expect(result).toBe(false)
    })

    it('should return false when albumId is empty string', () => {
      const result = shouldShowAlbumName('Summer Vacation', '')
      
      expect(result).toBe(false)
    })
  })

  describe('getAlbumBadgeText', () => {
    it('should return consistent album badge text', () => {
      const result = getAlbumBadgeText()
      
      expect(result).toBe('📁 Album')
    })

    it('should always return the same text', () => {
      const result1 = getAlbumBadgeText()
      const result2 = getAlbumBadgeText()
      
      expect(result1).toBe(result2)
    })
  })

  describe('formatHeaderSubtitle', () => {
    const mockGetRelativeTime = (date: string): string => {
      return '2 hours ago'
    }

    it('should format complete subtitle with photo count and time', () => {
      const result = formatHeaderSubtitle(
        20, 15, '2024-01-01T10:00:00Z', mockGetRelativeTime, 25, true
      )
      
      expect(result).toBe('15 of 25 photos • 2 hours ago')
    })

    it('should format subtitle without estimated count', () => {
      const result = formatHeaderSubtitle(
        20, 15, '2024-01-01T10:00:00Z', mockGetRelativeTime
      )
      
      expect(result).toBe('20 photos • 2 hours ago')
    })

    it('should handle different time formats', () => {
      const customGetRelativeTime = (date: string): string => {
        return 'just now'
      }

      const result = formatHeaderSubtitle(
        5, 5, '2024-01-01T10:00:00Z', customGetRelativeTime, 5, false
      )
      
      expect(result).toBe('5 photos • just now')
    })

    it('should handle single photo case', () => {
      const result = formatHeaderSubtitle(
        1, 1, '2024-01-01T10:00:00Z', mockGetRelativeTime, 1, false
      )
      
      expect(result).toBe('1 photos • 2 hours ago')
    })

    it('should handle zero photos case', () => {
      const result = formatHeaderSubtitle(
        0, 0, '2024-01-01T10:00:00Z', mockGetRelativeTime, 0, false
      )
      
      expect(result).toBe('0 photos • 2 hours ago')
    })

    it('should handle large numbers', () => {
      const result = formatHeaderSubtitle(
        1000, 500, '2024-01-01T10:00:00Z', mockGetRelativeTime, 1500, true
      )
      
      expect(result).toBe('500 of 1500 photos • 2 hours ago')
    })
  })

  describe('integration: header text generation workflow', () => {
    const mockGetRelativeTime = (date: string): string => {
      if (date.includes('2024-01-01')) return '2 hours ago'
      if (date.includes('2024-01-02')) return '1 day ago'
      return 'some time ago'
    }

    it('should generate complete header text for normal album', () => {
      const albumName = 'Summer Vacation 2024'
      const albumId = 'vacation-album-123'
      const totalPhotos = 50
      const photosToShow = 30
      const uploadedAt = '2024-01-01T10:00:00Z'

      // Test individual components
      expect(shouldShowAlbumName(albumName, albumId)).toBe(true)
      expect(getAlbumBadgeText()).toBe('📁 Album')
      
      const subtitle = formatHeaderSubtitle(
        totalPhotos, photosToShow, uploadedAt, mockGetRelativeTime
      )
      expect(subtitle).toBe('50 photos • 2 hours ago')
    })

    it('should generate header text for incomplete album', () => {
      const totalPhotos = 100
      const photosToShow = 25
      const estimatedTotalCount = 150
      const uploadedAt = '2024-01-02T15:30:00Z'

      const subtitle = formatHeaderSubtitle(
        totalPhotos, photosToShow, uploadedAt, mockGetRelativeTime, estimatedTotalCount, true
      )
      expect(subtitle).toBe('25 of 150 photos • 1 day ago')
    })

    it('should handle album without name/id', () => {
      expect(shouldShowAlbumName(undefined, undefined)).toBe(false)
      
      const subtitle = formatHeaderSubtitle(
        10, 10, '2024-01-01T10:00:00Z', mockGetRelativeTime, 10, false
      )
      expect(subtitle).toBe('10 photos • 2 hours ago')
    })
  })
})