import { describe, it, expect } from 'vitest'
import {
  getAlbumPhotosForSelectedPhoto,
  selectAllPhotos,
  getFilterMessage,
  countFilteredPhotos,
  shouldShowLoadMoreAlbums,
  shouldShowEndOfPhotos
} from '../photoGridUtils'

describe('photoGridUtils', () => {
  const mockPhotos = [
    { id: 'photo1', uploadedAt: '2024-01-01T10:00:00Z' },
    { id: 'photo2', uploadedAt: '2024-01-01T09:00:00Z' },
    { id: 'photo3', uploadedAt: '2024-01-01T11:00:00Z' }
  ] as any[]

  const mockFilteredDisplay = [
    {
      id: 'group1',
      isGroup: true,
      photos: [mockPhotos[0], mockPhotos[1], mockPhotos[2]]
    },
    {
      id: 'single1',
      isGroup: false,
      photos: [{ id: 'photo4' } as any]
    },
    {
      id: 'group2',
      isGroup: true,
      photos: [{ id: 'photo5' }, { id: 'photo6' }] as any[]
    }
  ] as any[]

  describe('getAlbumPhotosForSelectedPhoto', () => {
    it('should return undefined if no photo selected', () => {
      const result = getAlbumPhotosForSelectedPhoto(null, mockFilteredDisplay)
      expect(result).toBeUndefined()
    })

    it('should return sorted album photos for photo in group', () => {
      const result = getAlbumPhotosForSelectedPhoto(mockPhotos[0], mockFilteredDisplay)
      
      expect(result).toHaveLength(3)
      expect(result![0].id).toBe('photo2') // Earliest date
      expect(result![1].id).toBe('photo1') // Middle date
      expect(result![2].id).toBe('photo3') // Latest date
    })

    it('should return undefined for single photo not in group', () => {
      const singlePhoto = { id: 'photo4' } as any
      const result = getAlbumPhotosForSelectedPhoto(singlePhoto, mockFilteredDisplay)
      
      expect(result).toBeUndefined()
    })

    it('should return undefined if photo not found in any group', () => {
      const unknownPhoto = { id: 'unknown' } as any
      const result = getAlbumPhotosForSelectedPhoto(unknownPhoto, mockFilteredDisplay)
      
      expect(result).toBeUndefined()
    })

    it('should handle group with single photo', () => {
      const singlePhotoGroup = [
        {
          id: 'group1',
          isGroup: true,
          photos: [mockPhotos[0]]
        }
      ] as any[]

      const result = getAlbumPhotosForSelectedPhoto(mockPhotos[0], singlePhotoGroup)
      
      expect(result).toHaveLength(1)
      expect(result![0].id).toBe('photo1')
    })
  })

  describe('selectAllPhotos', () => {
    it('should return all photo IDs from filtered display', () => {
      const result = selectAllPhotos(mockFilteredDisplay)
      
      expect(result).toHaveLength(6)
      expect(result).toContain('photo1')
      expect(result).toContain('photo2')
      expect(result).toContain('photo3')
      expect(result).toContain('photo4')
      expect(result).toContain('photo5')
      expect(result).toContain('photo6')
    })

    it('should return empty array for empty filtered display', () => {
      const result = selectAllPhotos([])
      expect(result).toHaveLength(0)
    })

    it('should handle groups with no photos', () => {
      const emptyGroups = [
        { id: 'group1', photos: [] },
        { id: 'group2', photos: [] }
      ] as any[]

      const result = selectAllPhotos(emptyGroups)
      expect(result).toHaveLength(0)
    })
  })

  describe('getFilterMessage', () => {
    it('should return "tags or users" when both filters active', () => {
      const result = getFilterMessage(['tag1'], ['user1'])
      expect(result).toBe('tags or users')
    })

    it('should return "tags" when only tags filter active', () => {
      const result = getFilterMessage(['tag1'], [])
      expect(result).toBe('tags')
    })

    it('should return "users" when only users filter active', () => {
      const result = getFilterMessage([], ['user1'])
      expect(result).toBe('users')
    })

    it('should return "users" when no filters active', () => {
      const result = getFilterMessage([], [])
      expect(result).toBe('users')
    })

    it('should handle multiple tags and users', () => {
      const result = getFilterMessage(['tag1', 'tag2'], ['user1', 'user2'])
      expect(result).toBe('tags or users')
    })
  })

  describe('countFilteredPhotos', () => {
    it('should count all photos in filtered display', () => {
      const result = countFilteredPhotos(mockFilteredDisplay)
      expect(result).toBe(6)
    })

    it('should return 0 for empty filtered display', () => {
      const result = countFilteredPhotos([])
      expect(result).toBe(0)
    })

    it('should handle groups with varying photo counts', () => {
      const mixedGroups = [
        { photos: [1, 2, 3] },
        { photos: [1] },
        { photos: [] },
        { photos: [1, 2] }
      ] as any[]

      const result = countFilteredPhotos(mixedGroups)
      expect(result).toBe(6)
    })
  })

  describe('shouldShowLoadMoreAlbums', () => {
    it('should return true when not showing all albums and has 4+ groups', () => {
      const groupsDisplay = Array(5).fill(null).map((_, i) => ({ 
        id: `group${i}`, 
        isGroup: true 
      })) as any[]

      const result = shouldShowLoadMoreAlbums(false, groupsDisplay)
      expect(result).toBe(true)
    })

    it('should return false when already showing all albums', () => {
      const groupsDisplay = Array(5).fill(null).map((_, i) => ({ 
        id: `group${i}`, 
        isGroup: true 
      })) as any[]

      const result = shouldShowLoadMoreAlbums(true, groupsDisplay)
      expect(result).toBe(false)
    })

    it('should return false when less than 4 groups', () => {
      const groupsDisplay = Array(3).fill(null).map((_, i) => ({ 
        id: `group${i}`, 
        isGroup: true 
      })) as any[]

      const result = shouldShowLoadMoreAlbums(false, groupsDisplay)
      expect(result).toBe(false)
    })

    it('should count only groups, not singles', () => {
      const mixedDisplay = [
        { id: 'group1', isGroup: true },
        { id: 'single1', isGroup: false },
        { id: 'group2', isGroup: true },
        { id: 'group3', isGroup: true },
        { id: 'group4', isGroup: true },
        { id: 'single2', isGroup: false }
      ] as any[]

      const result = shouldShowLoadMoreAlbums(false, mixedDisplay)
      expect(result).toBe(true)
    })
  })

  describe('shouldShowEndOfPhotos', () => {
    it('should return true when all conditions met', () => {
      const result = shouldShowEndOfPhotos(false, 10, [], [])
      expect(result).toBe(true)
    })

    it('should return false when hasMore is true', () => {
      const result = shouldShowEndOfPhotos(true, 10, [], [])
      expect(result).toBe(false)
    })

    it('should return false when no photos', () => {
      const result = shouldShowEndOfPhotos(false, 0, [], [])
      expect(result).toBe(false)
    })

    it('should return false when tags filter active', () => {
      const result = shouldShowEndOfPhotos(false, 10, ['tag1'], [])
      expect(result).toBe(false)
    })

    it('should return false when users filter active', () => {
      const result = shouldShowEndOfPhotos(false, 10, [], ['user1'])
      expect(result).toBe(false)
    })

    it('should return false when both filters active', () => {
      const result = shouldShowEndOfPhotos(false, 10, ['tag1'], ['user1'])
      expect(result).toBe(false)
    })

    it('should handle edge case with exactly 1 photo', () => {
      const result = shouldShowEndOfPhotos(false, 1, [], [])
      expect(result).toBe(true)
    })
  })
})
