import { describe, it, expect } from 'vitest'
import {
  getAlbumPhotosForSelectedPhoto,
  selectAllPhotos,
  getFilterMessage,
  countFilteredPhotos,
  shouldShowLoadMoreAlbums,
  shouldShowEndOfPhotos
} from '../../utils/photoGridUtils'

// These tests specifically validate the utility functions extracted from PhotoGrid.tsx
// This follows our pattern of extracting testable functions from components

describe('PhotoGrid Utility Functions', () => {
  describe('getAlbumPhotosForSelectedPhoto', () => {
    it('should return undefined when no photo is selected', () => {
      const result = getAlbumPhotosForSelectedPhoto(null, [])
      expect(result).toBeUndefined()
    })

    it('should return undefined when photo is not in a group', () => {
      const selectedPhoto = { id: 'photo-1', uploadedAt: '2024-01-01' } as any
      const filteredDisplay: any[] = [
        {
          id: 'single-1',
          isGroup: false,
          photos: [selectedPhoto]
        }
      ]

      const result = getAlbumPhotosForSelectedPhoto(selectedPhoto, filteredDisplay)
      expect(result).toBeUndefined()
    })

    it('should return sorted album photos when photo is in a group', () => {
      const selectedPhoto = { id: 'photo-2', uploadedAt: '2024-01-02' } as any
      const filteredDisplay: any[] = [
        {
          id: 'album-1',
          isGroup: true,
          photos: [
            { id: 'photo-3', uploadedAt: '2024-01-03' },
            { id: 'photo-1', uploadedAt: '2024-01-01' },
            selectedPhoto
          ]
        }
      ]

      const result = getAlbumPhotosForSelectedPhoto(selectedPhoto, filteredDisplay)
      expect(result).toEqual([
        { id: 'photo-1', uploadedAt: '2024-01-01' },
        { id: 'photo-2', uploadedAt: '2024-01-02' },
        { id: 'photo-3', uploadedAt: '2024-01-03' }
      ])
    })

    it('should find photo in correct group when multiple groups exist', () => {
      const selectedPhoto = { id: 'photo-target', uploadedAt: '2024-01-02' } as any
      const filteredDisplay: any[] = [
        {
          id: 'album-1',
          isGroup: true,
          photos: [{ id: 'photo-other', uploadedAt: '2024-01-01' }]
        },
        {
          id: 'album-2',
          isGroup: true,
          photos: [
            { id: 'photo-before', uploadedAt: '2024-01-01' },
            selectedPhoto,
            { id: 'photo-after', uploadedAt: '2024-01-03' }
          ]
        }
      ]

      const result = getAlbumPhotosForSelectedPhoto(selectedPhoto, filteredDisplay)
      expect(result).toEqual([
        { id: 'photo-before', uploadedAt: '2024-01-01' },
        { id: 'photo-target', uploadedAt: '2024-01-02' },
        { id: 'photo-after', uploadedAt: '2024-01-03' }
      ])
    })
  })

  describe('selectAllPhotos', () => {
    it('should return empty array when no groups', () => {
      const result = selectAllPhotos([])
      expect(result).toEqual([])
    })

    it('should collect all photo IDs from all groups', () => {
      const filteredDisplay: any[] = [
        {
          id: 'group-1',
          photos: [{ id: 'photo-1' }, { id: 'photo-2' }]
        },
        {
          id: 'group-2',
          photos: [{ id: 'photo-3' }]
        },
        {
          id: 'group-3',
          photos: [{ id: 'photo-4' }, { id: 'photo-5' }, { id: 'photo-6' }]
        }
      ]

      const result = selectAllPhotos(filteredDisplay)
      expect(result).toEqual(['photo-1', 'photo-2', 'photo-3', 'photo-4', 'photo-5', 'photo-6'])
    })

    it('should handle groups with no photos', () => {
      const filteredDisplay: any[] = [
        { id: 'group-1', photos: [{ id: 'photo-1' }] },
        { id: 'group-2', photos: [] },
        { id: 'group-3', photos: [{ id: 'photo-2' }] }
      ]

      const result = selectAllPhotos(filteredDisplay)
      expect(result).toEqual(['photo-1', 'photo-2'])
    })
  })

  describe('getFilterMessage', () => {
    it('should return "tags or users" when both filters are active', () => {
      const result = getFilterMessage(['tag1'], ['user1'])
      expect(result).toBe('tags or users')
    })

    it('should return "tags" when only tag filter is active', () => {
      const result = getFilterMessage(['tag1'], [])
      expect(result).toBe('tags')
    })

    it('should return "users" when only user filter is active', () => {
      const result = getFilterMessage([], ['user1'])
      expect(result).toBe('users')
    })

    it('should return "users" when no filters are active', () => {
      const result = getFilterMessage([], [])
      expect(result).toBe('users')
    })
  })

  describe('countFilteredPhotos', () => {
    it('should count photos across all groups', () => {
      const filteredDisplay: any[] = [
        { id: 'group-1', photos: [{ id: 'photo-1' }, { id: 'photo-2' }] },
        { id: 'group-2', photos: [{ id: 'photo-3' }] },
        { id: 'group-3', photos: [{ id: 'photo-4' }, { id: 'photo-5' }, { id: 'photo-6' }] }
      ]

      const result = countFilteredPhotos(filteredDisplay)
      expect(result).toBe(6)
    })

    it('should return 0 when no groups', () => {
      const result = countFilteredPhotos([])
      expect(result).toBe(0)
    })
  })

  describe('shouldShowLoadMoreAlbums', () => {
    it('should return true when not showing all albums and has 4+ groups', () => {
      const filteredDisplay = Array(5).fill(null).map((_, i) => ({ 
        id: `group${i}`, 
        isGroup: true 
      })) as any[]

      const result = shouldShowLoadMoreAlbums(false, filteredDisplay)
      expect(result).toBe(true)
    })

    it('should return false when already showing all albums', () => {
      const filteredDisplay = Array(5).fill(null).map((_, i) => ({ 
        id: `group${i}`, 
        isGroup: true 
      })) as any[]

      const result = shouldShowLoadMoreAlbums(true, filteredDisplay)
      expect(result).toBe(false)
    })

    it('should return false when less than 4 groups', () => {
      const filteredDisplay = Array(3).fill(null).map((_, i) => ({ 
        id: `group${i}`, 
        isGroup: true 
      })) as any[]

      const result = shouldShowLoadMoreAlbums(false, filteredDisplay)
      expect(result).toBe(false)
    })

    it('should count only groups, not singles', () => {
      const mixedDisplay: any[] = [
        { id: 'group1', isGroup: true },
        { id: 'single1', isGroup: false },
        { id: 'group2', isGroup: true },
        { id: 'group3', isGroup: true },
        { id: 'group4', isGroup: true }
      ]

      const result = shouldShowLoadMoreAlbums(false, mixedDisplay)
      expect(result).toBe(true)
    })
  })

  describe('shouldShowEndOfPhotos', () => {
    it('should return true when all conditions are met', () => {
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

    it('should return false when tags filter is active', () => {
      const result = shouldShowEndOfPhotos(false, 10, ['tag1'], [])
      expect(result).toBe(false)
    })

    it('should return false when users filter is active', () => {
      const result = shouldShowEndOfPhotos(false, 10, [], ['user1'])
      expect(result).toBe(false)
    })

    it('should return false when both filters are active', () => {
      const result = shouldShowEndOfPhotos(false, 10, ['tag1'], ['user1'])
      expect(result).toBe(false)
    })
  })
})
