import { describe, it, expect } from 'vitest'
import {
  getGridColumnsClass,
  shouldShowMoreCard,
  getMoreCount,
  getImageSource,
  getPhotoAltText,
  shouldHavePriority,
  getPhotosToDisplay,
  calculateGridLayout,
  type Photo
} from '../../utils/albumPhotosGridUtils'

/**
 * Tests for AlbumPhotosGrid utility functions and grid layout calculations
 * This tests the logic used to determine grid layouts and photo display
 */

describe('AlbumPhotosGrid Utils', () => {
  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      url: 'https://example.com/photo1.jpg',
      thumbnailUrl: 'https://example.com/photo1-thumb.jpg',
      caption: 'Beautiful sunset',
      location: 'Beach'
    },
    {
      id: 'photo-2',
      url: 'https://example.com/photo2.jpg',
      thumbnailUrl: 'https://example.com/photo2-thumb.jpg'
    },
    {
      id: 'photo-3',
      url: 'https://example.com/photo3.jpg',
      caption: 'Mountain view'
    },
    {
      id: 'photo-4',
      url: 'https://example.com/photo4.jpg',
      thumbnailUrl: 'https://example.com/photo4-thumb.jpg',
      location: 'Mountains'
    },
    {
      id: 'photo-5',
      url: 'https://example.com/photo5.jpg'
    },
    {
      id: 'photo-6',
      url: 'https://example.com/photo6.jpg',
      thumbnailUrl: 'https://example.com/photo6-thumb.jpg'
    }
  ]

  describe('getGridColumnsClass', () => {
    it('should return grid-cols-1 for 1 photo', () => {
      expect(getGridColumnsClass(1)).toBe('grid-cols-1')
    })

    it('should return grid-cols-2 for 2 photos', () => {
      expect(getGridColumnsClass(2)).toBe('grid-cols-2')
    })

    it('should return grid-cols-3 for 3 photos', () => {
      expect(getGridColumnsClass(3)).toBe('grid-cols-3')
    })

    it('should return grid-cols-2 for 4 photos', () => {
      expect(getGridColumnsClass(4)).toBe('grid-cols-2')
    })

    it('should return grid-cols-3 for 5 photos', () => {
      expect(getGridColumnsClass(5)).toBe('grid-cols-3')
    })

    it('should return grid-cols-3 for 6 photos', () => {
      expect(getGridColumnsClass(6)).toBe('grid-cols-3')
    })

    it('should return grid-cols-3 for more than 6 photos', () => {
      expect(getGridColumnsClass(7)).toBe('grid-cols-3')
      expect(getGridColumnsClass(10)).toBe('grid-cols-3')
      expect(getGridColumnsClass(100)).toBe('grid-cols-3')
    })

    it('should handle edge cases', () => {
      expect(getGridColumnsClass(0)).toBe('grid-cols-3')
      expect(getGridColumnsClass(-1)).toBe('grid-cols-3')
    })
  })

  describe('shouldShowMoreCard', () => {
    it('should return true when total > photos to show', () => {
      expect(shouldShowMoreCard(10, 5)).toBe(true)
      expect(shouldShowMoreCard(100, 25)).toBe(true)
    })

    it('should return false when total equals photos to show', () => {
      expect(shouldShowMoreCard(5, 5)).toBe(false)
      expect(shouldShowMoreCard(25, 25)).toBe(false)
    })

    it('should return false when total < photos to show', () => {
      expect(shouldShowMoreCard(3, 5)).toBe(false)
      expect(shouldShowMoreCard(10, 25)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(shouldShowMoreCard(0, 0)).toBe(false)
      expect(shouldShowMoreCard(1, 0)).toBe(true)
      expect(shouldShowMoreCard(0, 1)).toBe(false)
    })
  })

  describe('getMoreCount', () => {
    it('should calculate correct more count', () => {
      expect(getMoreCount(10, 5)).toBe(5)
      expect(getMoreCount(100, 25)).toBe(75)
      expect(getMoreCount(7, 3)).toBe(4)
    })

    it('should return 0 when total equals photos to show', () => {
      expect(getMoreCount(5, 5)).toBe(0)
      expect(getMoreCount(25, 25)).toBe(0)
    })

    it('should return 0 when total < photos to show', () => {
      expect(getMoreCount(3, 5)).toBe(0)
      expect(getMoreCount(10, 25)).toBe(0)
    })

    it('should handle edge cases', () => {
      expect(getMoreCount(0, 0)).toBe(0)
      expect(getMoreCount(1, 0)).toBe(1)
      expect(getMoreCount(0, 1)).toBe(0)
    })
  })

  describe('getImageSource', () => {
    it('should return thumbnail URL when available', () => {
      const photo = mockPhotos[0]
      expect(getImageSource(photo)).toBe('https://example.com/photo1-thumb.jpg')
    })

    it('should return main URL when thumbnail not available', () => {
      const photo = mockPhotos[2]
      expect(getImageSource(photo)).toBe('https://example.com/photo3.jpg')
    })

    it('should handle undefined thumbnail', () => {
      const photo = {
        id: 'test',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: undefined
      }
      expect(getImageSource(photo)).toBe('https://example.com/test.jpg')
    })
  })

  describe('getPhotoAltText', () => {
    it('should return caption when available', () => {
      const photo = mockPhotos[0]
      expect(getPhotoAltText(photo)).toBe('Beautiful sunset')
    })

    it('should return default text when caption not available', () => {
      const photo = mockPhotos[1]
      expect(getPhotoAltText(photo)).toBe('Family photo')
    })

    it('should handle undefined caption', () => {
      const photo = {
        id: 'test',
        url: 'https://example.com/test.jpg',
        caption: undefined
      }
      expect(getPhotoAltText(photo)).toBe('Family photo')
    })

    it('should handle empty caption', () => {
      const photo = {
        id: 'test',
        url: 'https://example.com/test.jpg',
        caption: ''
      }
      expect(getPhotoAltText(photo)).toBe('Family photo')
    })
  })

  describe('shouldHavePriority', () => {
    it('should return true for first photo with global priority', () => {
      expect(shouldHavePriority(0, true)).toBe(true)
    })

    it('should return false for non-first photo with global priority', () => {
      expect(shouldHavePriority(1, true)).toBe(false)
      expect(shouldHavePriority(2, true)).toBe(false)
    })

    it('should return false when global priority is false', () => {
      expect(shouldHavePriority(0, false)).toBe(false)
      expect(shouldHavePriority(1, false)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(shouldHavePriority(-1, true)).toBe(false)
      expect(shouldHavePriority(100, true)).toBe(false)
    })
  })

  describe('getPhotosToDisplay', () => {
    it('should return sliced array when photos > limit', () => {
      const result = getPhotosToDisplay(mockPhotos, 3)
      
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('photo-1')
      expect(result[1].id).toBe('photo-2')
      expect(result[2].id).toBe('photo-3')
    })

    it('should return all photos when photos <= limit', () => {
      const result = getPhotosToDisplay(mockPhotos, 10)
      
      expect(result).toHaveLength(6)
      expect(result).toEqual(mockPhotos)
    })

    it('should return empty array for empty input', () => {
      const result = getPhotosToDisplay([], 5)
      
      expect(result).toEqual([])
    })

    it('should handle limit of 0', () => {
      const result = getPhotosToDisplay(mockPhotos, 0)
      
      expect(result).toEqual([])
    })
  })

  describe('calculateGridLayout', () => {
    it('should calculate complete layout for normal case', () => {
      const result = calculateGridLayout(mockPhotos, 10, 4)
      
      expect(result.photosToDisplay).toHaveLength(4)
      expect(result.gridColumnsClass).toBe('grid-cols-3') // Based on total photos length (6)
      expect(result.shouldShowMore).toBe(true)
      expect(result.moreCount).toBe(6) // 10 - 4
    })

    it('should calculate layout when no more photos', () => {
      const result = calculateGridLayout(mockPhotos, 6, 6)
      
      expect(result.photosToDisplay).toHaveLength(6)
      expect(result.gridColumnsClass).toBe('grid-cols-3')
      expect(result.shouldShowMore).toBe(false)
      expect(result.moreCount).toBe(0)
    })

    it('should handle single photo', () => {
      const singlePhoto = [mockPhotos[0]]
      const result = calculateGridLayout(singlePhoto, 1, 1)
      
      expect(result.photosToDisplay).toHaveLength(1)
      expect(result.gridColumnsClass).toBe('grid-cols-1')
      expect(result.shouldShowMore).toBe(false)
      expect(result.moreCount).toBe(0)
    })

    it('should handle empty photos array', () => {
      const result = calculateGridLayout([], 0, 0)
      
      expect(result.photosToDisplay).toEqual([])
      expect(result.gridColumnsClass).toBe('grid-cols-3') // Default for 0 photos
      expect(result.shouldShowMore).toBe(false)
      expect(result.moreCount).toBe(0)
    })

    it('should handle showing fewer than available', () => {
      const twoPhotos = mockPhotos.slice(0, 2)
      const result = calculateGridLayout(twoPhotos, 5, 2)
      
      expect(result.photosToDisplay).toHaveLength(2)
      expect(result.gridColumnsClass).toBe('grid-cols-2')
      expect(result.shouldShowMore).toBe(true)
      expect(result.moreCount).toBe(3) // 5 - 2
    })
  })

  describe('integration: complete grid layout workflow', () => {
    it('should handle typical album display scenario', () => {
      const photos = mockPhotos.slice(0, 4)
      const totalPhotos = 15
      const photosToShow = 4
      
      const layout = calculateGridLayout(photos, totalPhotos, photosToShow)
      
      // Should show 4 photos in 2x2 grid with +11 more
      expect(layout.photosToDisplay).toHaveLength(4)
      expect(layout.gridColumnsClass).toBe('grid-cols-2')
      expect(layout.shouldShowMore).toBe(true)
      expect(layout.moreCount).toBe(11)
      
      // Test individual photos
      layout.photosToDisplay.forEach((photo, index) => {
        expect(getImageSource(photo)).toBeTruthy()
        expect(getPhotoAltText(photo)).toBeTruthy()
        expect(shouldHavePriority(index, true)).toBe(index === 0)
      })
    })

    it('should handle large album with many photos', () => {
      const manyPhotos = Array.from({ length: 50 }, (_, i) => ({
        id: `photo-${i + 1}`,
        url: `https://example.com/photo${i + 1}.jpg`,
        thumbnailUrl: `https://example.com/photo${i + 1}-thumb.jpg`
      }))
      
      const layout = calculateGridLayout(manyPhotos, 200, 25)
      
      expect(layout.photosToDisplay).toHaveLength(25)
      expect(layout.gridColumnsClass).toBe('grid-cols-3')
      expect(layout.shouldShowMore).toBe(true)
      expect(layout.moreCount).toBe(175) // 200 - 25
    })

    it('should handle complete small album', () => {
      const smallPhotos = mockPhotos.slice(0, 3)
      const layout = calculateGridLayout(smallPhotos, 3, 3)
      
      expect(layout.photosToDisplay).toHaveLength(3)
      expect(layout.gridColumnsClass).toBe('grid-cols-3')
      expect(layout.shouldShowMore).toBe(false)
      expect(layout.moreCount).toBe(0)
    })
  })
})