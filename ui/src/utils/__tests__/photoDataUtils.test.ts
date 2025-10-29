import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  loadInitialPhotos,
  loadAdditionalPhotos,
  loadAlbumMetadata,
  extractUniqueTags,
  extractUniqueUsers,
  shouldLoadMorePhotos,
  type AlbumMetadata,
  type PhotoLoadResult
} from '../photoDataUtils'
import * as api from '../../lib/api'

// Mock the API
vi.mock('../../lib/api', () => ({
  getPhotos: vi.fn(),
  getAlbums: vi.fn()
}))

const mockApi = api as any

// Mock Photo interface for testing
interface MockPhoto {
  id: string
  uploadSessionId?: string
  uploadedBy: string
  tags: string[]
  [key: string]: any
}

describe('photoDataUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadInitialPhotos', () => {
    it('should load photos from at least 4 different albums', async () => {
      // Mock API responses with photos from different albums
      mockApi.getPhotos
        .mockResolvedValueOnce({
          photos: [
            { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] },
            { id: 'photo2', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] },
            { id: 'photo3', uploadSessionId: 'album2', uploadedBy: 'user2', tags: [] }
          ],
          lastKey: 'key1'
        })
        .mockResolvedValueOnce({
          photos: [
            { id: 'photo4', uploadSessionId: 'album3', uploadedBy: 'user3', tags: [] },
            { id: 'photo5', uploadSessionId: 'album4', uploadedBy: 'user4', tags: [] }
          ],
          lastKey: 'key2'
        })

      const result = await loadInitialPhotos()

      expect(result.photos).toHaveLength(5)
      expect(result.lastKey).toBe('key2')
      expect(result.hasMore).toBe(true)
      expect(mockApi.getPhotos).toHaveBeenCalledTimes(2)
      expect(mockApi.getPhotos).toHaveBeenCalledWith(undefined, 50)
      expect(mockApi.getPhotos).toHaveBeenCalledWith('key1', 50)
    })

    it('should handle case with no more photos available', async () => {
      mockApi.getPhotos.mockResolvedValueOnce({
        photos: [
          { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] },
          { id: 'photo2', uploadSessionId: 'album2', uploadedBy: 'user2', tags: [] },
          { id: 'photo3', uploadSessionId: 'album3', uploadedBy: 'user3', tags: [] },
          { id: 'photo4', uploadSessionId: 'album4', uploadedBy: 'user4', tags: [] }
        ],
        lastKey: null
      })

      const result = await loadInitialPhotos()

      expect(result.photos).toHaveLength(4)
      expect(result.lastKey).toBeNull()
      expect(result.hasMore).toBe(false)
      expect(mockApi.getPhotos).toHaveBeenCalledTimes(1)
    })

    it('should filter out duplicate photos', async () => {
      mockApi.getPhotos
        .mockResolvedValueOnce({
          photos: [
            { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] },
            { id: 'photo2', uploadSessionId: 'album2', uploadedBy: 'user2', tags: [] }
          ],
          lastKey: 'key1'
        })
        .mockResolvedValueOnce({
          photos: [
            { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] }, // Duplicate
            { id: 'photo3', uploadSessionId: 'album3', uploadedBy: 'user3', tags: [] },
            { id: 'photo4', uploadSessionId: 'album4', uploadedBy: 'user4', tags: [] }
          ],
          lastKey: 'key2'
        })

      const result = await loadInitialPhotos()

      expect(result.photos).toHaveLength(4) // Should exclude the duplicate
      expect(result.photos.map(p => p.id)).toEqual(['photo1', 'photo2', 'photo3', 'photo4'])
    })

    it('should respect safety limit of 300 photos', async () => {
      // Mock many API calls that would exceed the limit
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        id: `photo${i}`,
        uploadSessionId: `album${Math.floor(i / 25)}`, // 4 photos per album
        uploadedBy: `user${i}`,
        tags: []
      }))

      mockApi.getPhotos.mockResolvedValue({
        photos: largeBatch,
        lastKey: 'keepGoing'
      })

      const result = await loadInitialPhotos()

      // Should stop at 300 photos max, even if hasMore is true
      expect(result.photos.length).toBeLessThanOrEqual(300)
    })

    it('should handle photos without uploadSessionId', async () => {
      mockApi.getPhotos.mockResolvedValueOnce({
        photos: [
          { id: 'photo1', uploadedBy: 'user1', tags: [] }, // No uploadSessionId
          { id: 'photo2', uploadSessionId: 'album1', uploadedBy: 'user2', tags: [] },
          { id: 'photo3', uploadSessionId: 'album2', uploadedBy: 'user3', tags: [] },
          { id: 'photo4', uploadSessionId: 'album3', uploadedBy: 'user4', tags: [] },
          { id: 'photo5', uploadSessionId: 'album4', uploadedBy: 'user5', tags: [] }
        ],
        lastKey: null
      })

      const result = await loadInitialPhotos()

      expect(result.photos).toHaveLength(5)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('loadAdditionalPhotos', () => {
    it('should load additional photos and merge with existing', async () => {
      const currentPhotos: MockPhoto[] = [
        { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] }
      ]

      mockApi.getPhotos.mockResolvedValueOnce({
        photos: [
          { id: 'photo2', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] },
          { id: 'photo3', uploadSessionId: 'album2', uploadedBy: 'user2', tags: [] }
        ],
        lastKey: 'key2'
      })

      const result = await loadAdditionalPhotos(currentPhotos, 'key1')

      expect(result.photos).toHaveLength(3)
      expect(result.photos.map(p => p.id)).toEqual(['photo1', 'photo2', 'photo3'])
      expect(result.lastKey).toBe('key2')
      expect(result.hasMore).toBe(true)
      expect(mockApi.getPhotos).toHaveBeenCalledWith('key1', 20)
    })

    it('should filter out duplicate photos in additional load', async () => {
      const currentPhotos: MockPhoto[] = [
        { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] },
        { id: 'photo2', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] }
      ]

      mockApi.getPhotos.mockResolvedValueOnce({
        photos: [
          { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] }, // Duplicate
          { id: 'photo3', uploadSessionId: 'album2', uploadedBy: 'user2', tags: [] }
        ],
        lastKey: null
      })

      const result = await loadAdditionalPhotos(currentPhotos, 'key1')

      expect(result.photos).toHaveLength(3) // Should exclude duplicate
      expect(result.photos.map(p => p.id)).toEqual(['photo1', 'photo2', 'photo3'])
      expect(result.hasMore).toBe(false)
    })

    it('should handle null lastKey', async () => {
      const currentPhotos: MockPhoto[] = []

      mockApi.getPhotos.mockResolvedValueOnce({
        photos: [
          { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] }
        ],
        lastKey: null
      })

      const result = await loadAdditionalPhotos(currentPhotos, null)

      expect(mockApi.getPhotos).toHaveBeenCalledWith(undefined, 20)
      expect(result.photos).toHaveLength(1)
      expect(result.hasMore).toBe(false)
    })

    it('should handle empty additional photos response', async () => {
      const currentPhotos: MockPhoto[] = [
        { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1', tags: [] }
      ]

      mockApi.getPhotos.mockResolvedValueOnce({
        photos: [],
        lastKey: null
      })

      const result = await loadAdditionalPhotos(currentPhotos, 'key1')

      expect(result.photos).toHaveLength(1) // Only original photos
      expect(result.hasMore).toBe(false)
    })
  })

  describe('loadAlbumMetadata', () => {
    it('should load and format album metadata', async () => {
      mockApi.getAlbums.mockResolvedValueOnce({
        albums: [
          {
            id: 'album1',
            name: 'Summer Vacation',
            photoCount: 25,
            comments: [
              { id: 'c1', content: 'Great trip!', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' }
            ],
            reactions: [
              { id: 'r1', type: '❤️', author: 'user2@example.com', createdAt: '2024-01-01T11:00:00Z' }
            ]
          },
          {
            id: 'album2',
            name: 'Winter Holiday',
            photoCount: 15
            // No comments or reactions
          }
        ]
      })

      const result = await loadAlbumMetadata()

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(2)
      
      const album1 = result.get('album1')
      expect(album1).toEqual({
        name: 'Summer Vacation',
        photoCount: 25,
        comments: [
          { id: 'c1', content: 'Great trip!', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' }
        ],
        reactions: [
          { id: 'r1', type: '❤️', author: 'user2@example.com', createdAt: '2024-01-01T11:00:00Z' }
        ]
      })

      const album2 = result.get('album2')
      expect(album2).toEqual({
        name: 'Winter Holiday',
        photoCount: 15,
        comments: [],
        reactions: []
      })
    })

    it('should handle empty albums response', async () => {
      mockApi.getAlbums.mockResolvedValueOnce({
        albums: []
      })

      const result = await loadAlbumMetadata()

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('should handle albums with minimal data', async () => {
      mockApi.getAlbums.mockResolvedValueOnce({
        albums: [
          {
            id: 'album1',
            name: 'Basic Album',
            photoCount: 0
            // No comments, reactions, or other optional fields
          }
        ]
      })

      const result = await loadAlbumMetadata()

      expect(result.size).toBe(1)
      const album = result.get('album1')
      expect(album).toEqual({
        name: 'Basic Album',
        photoCount: 0,
        comments: [],
        reactions: []
      })
    })
  })

  describe('extractUniqueTags', () => {
    it('should extract and sort unique tags from photos', () => {
      const photos: MockPhoto[] = [
        { id: 'photo1', uploadedBy: 'user1', tags: ['vacation', 'beach', 'family'] },
        { id: 'photo2', uploadedBy: 'user2', tags: ['beach', 'sunset', 'vacation'] },
        { id: 'photo3', uploadedBy: 'user3', tags: ['mountains', 'hiking'] },
        { id: 'photo4', uploadedBy: 'user4', tags: [] }
      ]

      const result = extractUniqueTags(photos)

      expect(result).toEqual(['beach', 'family', 'hiking', 'mountains', 'sunset', 'vacation'])
    })

    it('should handle empty photos array', () => {
      const result = extractUniqueTags([])

      expect(result).toEqual([])
    })

    it('should handle photos with no tags', () => {
      const photos: MockPhoto[] = [
        { id: 'photo1', uploadedBy: 'user1', tags: [] },
        { id: 'photo2', uploadedBy: 'user2', tags: [] }
      ]

      const result = extractUniqueTags(photos)

      expect(result).toEqual([])
    })

    it('should handle duplicate tags across photos', () => {
      const photos: MockPhoto[] = [
        { id: 'photo1', uploadedBy: 'user1', tags: ['tag1', 'tag2'] },
        { id: 'photo2', uploadedBy: 'user2', tags: ['tag2', 'tag3'] },
        { id: 'photo3', uploadedBy: 'user3', tags: ['tag1', 'tag3'] }
      ]

      const result = extractUniqueTags(photos)

      expect(result).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should maintain sorted order', () => {
      const photos: MockPhoto[] = [
        { id: 'photo1', uploadedBy: 'user1', tags: ['zebra', 'apple', 'banana'] }
      ]

      const result = extractUniqueTags(photos)

      expect(result).toEqual(['apple', 'banana', 'zebra'])
    })
  })

  describe('extractUniqueUsers', () => {
    it('should extract and sort unique users from photos', () => {
      const photos: MockPhoto[] = [
        { id: 'photo1', uploadedBy: 'user3@example.com', tags: [] },
        { id: 'photo2', uploadedBy: 'user1@example.com', tags: [] },
        { id: 'photo3', uploadedBy: 'user2@example.com', tags: [] },
        { id: 'photo4', uploadedBy: 'user1@example.com', tags: [] } // Duplicate
      ]

      const result = extractUniqueUsers(photos)

      expect(result).toEqual(['user1@example.com', 'user2@example.com', 'user3@example.com'])
    })

    it('should handle empty photos array', () => {
      const result = extractUniqueUsers([])

      expect(result).toEqual([])
    })

    it('should handle single user', () => {
      const photos: MockPhoto[] = [
        { id: 'photo1', uploadedBy: 'singleuser@example.com', tags: [] },
        { id: 'photo2', uploadedBy: 'singleuser@example.com', tags: [] }
      ]

      const result = extractUniqueUsers(photos)

      expect(result).toEqual(['singleuser@example.com'])
    })

    it('should maintain sorted order with various formats', () => {
      const photos: MockPhoto[] = [
        { id: 'photo1', uploadedBy: 'zoe@example.com', tags: [] },
        { id: 'photo2', uploadedBy: 'alice@example.com', tags: [] },
        { id: 'photo3', uploadedBy: 'bob@example.com', tags: [] }
      ]

      const result = extractUniqueUsers(photos)

      expect(result).toEqual(['alice@example.com', 'bob@example.com', 'zoe@example.com'])
    })
  })

  describe('shouldLoadMorePhotos', () => {
    // Mock DOM properties
    let originalWindow: typeof window
    let originalDocument: typeof document

    beforeEach(() => {
      originalWindow = global.window
      originalDocument = global.document

      // Mock window and document properties
      global.window = {
        innerHeight: 800
      } as any

      global.document = {
        documentElement: {
          scrollTop: 0,
          offsetHeight: 2000
        }
      } as any
    })

    afterEach(() => {
      global.window = originalWindow
      global.document = originalDocument
    })

    it('should return true when near bottom of page', () => {
      // Simulate scroll position near bottom
      global.document.documentElement.scrollTop = 1200 // 800 + 1200 = 2000, which is >= 2000 - 1000

      const result = shouldLoadMorePhotos()

      expect(result).toBe(true)
    })

    it('should return false when not near bottom of page', () => {
      // Simulate scroll position not near bottom
      global.document.documentElement.scrollTop = 100 // 800 + 100 = 900, which is < 2000 - 1000

      const result = shouldLoadMorePhotos()

      expect(result).toBe(false)
    })

    it('should return true when exactly at threshold', () => {
      // Simulate scroll position exactly at threshold
      global.document.documentElement.scrollTop = 200 // 800 + 200 = 1000, which is >= 2000 - 1000

      const result = shouldLoadMorePhotos()

      expect(result).toBe(true)
    })

    it('should handle edge case with short page', () => {
      // Simulate very short page
      global.document.documentElement.offsetHeight = 500
      global.document.documentElement.scrollTop = 0

      const result = shouldLoadMorePhotos()

      // 800 + 0 = 800, which is >= 500 - 1000 (negative threshold, so always true)
      expect(result).toBe(true)
    })

    it('should handle different window heights', () => {
      global.window.innerHeight = 1200
      global.document.documentElement.scrollTop = 0
      global.document.documentElement.offsetHeight = 3000

      const result = shouldLoadMorePhotos()

      // 1200 + 0 = 1200, which is < 3000 - 1000 = 2000
      expect(result).toBe(false)

      // Now scroll down
      global.document.documentElement.scrollTop = 900

      const result2 = shouldLoadMorePhotos()

      // 1200 + 900 = 2100, which is >= 2000
      expect(result2).toBe(true)
    })
  })

  describe('integration: complete photo loading workflow', () => {
    it('should handle complete data loading workflow', async () => {
      // Setup mock responses for a complete workflow
      mockApi.getPhotos
        .mockResolvedValueOnce({
          photos: [
            { id: 'photo1', uploadSessionId: 'album1', uploadedBy: 'user1@example.com', tags: ['vacation', 'beach'] },
            { id: 'photo2', uploadSessionId: 'album2', uploadedBy: 'user2@example.com', tags: ['family', 'beach'] },
            { id: 'photo3', uploadSessionId: 'album3', uploadedBy: 'user1@example.com', tags: ['hiking'] },
            { id: 'photo4', uploadSessionId: 'album4', uploadedBy: 'user3@example.com', tags: ['sunset'] }
          ],
          lastKey: 'initialKey'
        })

      mockApi.getAlbums.mockResolvedValueOnce({
        albums: [
          { id: 'album1', name: 'Beach Trip', photoCount: 10 },
          { id: 'album2', name: 'Family Gathering', photoCount: 15 }
        ]
      })

      // Test initial load
      const initialResult = await loadInitialPhotos()
      expect(initialResult.photos).toHaveLength(4)
      expect(initialResult.hasMore).toBe(true)

      // Test tag extraction
      const tags = extractUniqueTags(initialResult.photos)
      expect(tags).toEqual(['beach', 'family', 'hiking', 'sunset', 'vacation'])

      // Test user extraction
      const users = extractUniqueUsers(initialResult.photos)
      expect(users).toEqual(['user1@example.com', 'user2@example.com', 'user3@example.com'])

      // Test album metadata loading
      const albumMetadata = await loadAlbumMetadata()
      expect(albumMetadata.size).toBe(2)
      expect(albumMetadata.get('album1')?.name).toBe('Beach Trip')

      // Test additional loading
      mockApi.getPhotos.mockResolvedValueOnce({
        photos: [
          { id: 'photo5', uploadSessionId: 'album1', uploadedBy: 'user2@example.com', tags: ['beach', 'waves'] }
        ],
        lastKey: null
      })

      const additionalResult = await loadAdditionalPhotos(initialResult.photos, initialResult.lastKey)
      expect(additionalResult.photos).toHaveLength(5)
      expect(additionalResult.hasMore).toBe(false)

      // Test updated tag extraction after additional load
      const updatedTags = extractUniqueTags(additionalResult.photos)
      expect(updatedTags).toEqual(['beach', 'family', 'hiking', 'sunset', 'vacation', 'waves'])
    })
  })
})
