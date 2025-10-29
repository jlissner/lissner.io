import { describe, it, expect } from 'vitest'
import {
  isDataLoading,
  findGroupByAlbumId,
  findPhotoById,
  shouldCloseModals,
  shouldOpenAlbum,
  shouldCloseAlbum,
  shouldOpenPhoto,
  shouldClosePhoto,
  createUrlParams,
  buildUrlPath,
  extractUrlParams,
  type Photo,
  type PhotoGroup
} from '../../utils/urlNavigationUtils'

/**
 * Tests for useUrlNavigation hook logic
 * This tests the pure business logic without DOM rendering
 */

describe('useUrlNavigation Logic', () => {
  const mockPhotos: Photo[] = [
    { id: 'photo1', caption: 'Photo 1' },
    { id: 'photo2', caption: 'Photo 2' },
    { id: 'photo3', caption: 'Photo 3' }
  ]

  const mockGroups: PhotoGroup[] = [
    { albumId: 'album1', name: 'Album 1' },
    { albumId: 'album2', name: 'Album 2' },
    { albumId: 'album3', name: 'Album 3' }
  ]

  describe('isDataLoading', () => {
    it('should return true when both arrays are empty', () => {
      expect(isDataLoading([], [])).toBe(true)
    })

    it('should return false when photos array has items', () => {
      expect(isDataLoading(mockPhotos, [])).toBe(false)
    })

    it('should return false when groups array has items', () => {
      expect(isDataLoading([], mockGroups)).toBe(false)
    })
  })

  describe('findGroupByAlbumId', () => {
    it('should find group by album ID', () => {
      const result = findGroupByAlbumId(mockGroups, 'album2')
      
      expect(result).toBeDefined()
      expect(result?.albumId).toBe('album2')
    })

    it('should return undefined for nonexistent album ID', () => {
      const result = findGroupByAlbumId(mockGroups, 'nonexistent')
      
      expect(result).toBeUndefined()
    })
  })

  describe('findPhotoById', () => {
    it('should find photo by ID', () => {
      const result = findPhotoById(mockPhotos, 'photo2')
      
      expect(result).toBeDefined()
      expect(result?.id).toBe('photo2')
    })

    it('should return undefined for nonexistent photo ID', () => {
      const result = findPhotoById(mockPhotos, 'nonexistent')
      
      expect(result).toBeUndefined()
    })
  })

  describe('shouldCloseModals', () => {
    it('should return true when both parameters are null', () => {
      expect(shouldCloseModals(null, null)).toBe(true)
    })

    it('should return false when album ID is provided', () => {
      expect(shouldCloseModals('album1', null)).toBe(false)
    })

    it('should return false when photo ID is provided', () => {
      expect(shouldCloseModals(null, 'photo1')).toBe(false)
    })
  })

  describe('shouldOpenAlbum', () => {
    it('should return shouldOpen true when album exists and no album selected', () => {
      const result = shouldOpenAlbum('album1', null, mockGroups)
      
      expect(result.shouldOpen).toBe(true)
      expect(result.group).toBeDefined()
      expect(result.group?.albumId).toBe('album1')
    })

    it('should return shouldOpen false when no album ID', () => {
      const result = shouldOpenAlbum(null, null, mockGroups)
      
      expect(result.shouldOpen).toBe(false)
    })

    it('should return shouldOpen false when album already selected', () => {
      const selectedGroup = mockGroups[0]
      const result = shouldOpenAlbum('album1', selectedGroup, mockGroups)
      
      expect(result.shouldOpen).toBe(false)
    })
  })

  describe('createUrlParams', () => {
    it('should create params with album ID only', () => {
      const params = createUrlParams('album1')
      
      expect(params.get('album')).toBe('album1')
      expect(params.get('photo')).toBeNull()
    })

    it('should create params with photo ID only', () => {
      const params = createUrlParams(undefined, 'photo1')
      
      expect(params.get('album')).toBeNull()
      expect(params.get('photo')).toBe('photo1')
    })

    it('should create params with both IDs', () => {
      const params = createUrlParams('album1', 'photo1')
      
      expect(params.get('album')).toBe('album1')
      expect(params.get('photo')).toBe('photo1')
    })
  })

  describe('buildUrlPath', () => {
    it('should build path with album parameter', () => {
      const path = buildUrlPath('album1')
      
      expect(path).toBe('/?album=album1')
    })

    it('should build path with photo parameter', () => {
      const path = buildUrlPath(undefined, 'photo1')
      
      expect(path).toBe('/?photo=photo1')
    })

    it('should build path with both parameters', () => {
      const path = buildUrlPath('album1', 'photo1')
      
      expect(path).toBe('/?album=album1&photo=photo1')
    })

    it('should build root path when no parameters', () => {
      const path = buildUrlPath()
      
      expect(path).toBe('/')
    })
  })

  describe('extractUrlParams', () => {
    it('should extract album and photo IDs', () => {
      const searchParams = new URLSearchParams('album=album1&photo=photo1')
      const result = extractUrlParams(searchParams)
      
      expect(result.albumId).toBe('album1')
      expect(result.photoId).toBe('photo1')
    })

    it('should extract album ID only', () => {
      const searchParams = new URLSearchParams('album=album1')
      const result = extractUrlParams(searchParams)
      
      expect(result.albumId).toBe('album1')
      expect(result.photoId).toBeNull()
    })

    it('should handle empty search params', () => {
      const searchParams = new URLSearchParams('')
      const result = extractUrlParams(searchParams)
      
      expect(result.albumId).toBeNull()
      expect(result.photoId).toBeNull()
    })
  })
})
