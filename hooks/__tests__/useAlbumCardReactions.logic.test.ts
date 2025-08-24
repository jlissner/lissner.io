import { describe, it, expect } from 'vitest'
import {
  filterUserReactions,
  findExistingReaction,
  hasUserReacted,
  canUserReact,
  addReactionOptimistically,
  removeReactionOptimistically,
  createTemporaryReaction,
  canProcessReactionClick,
  type Reaction
} from '../../utils/albumCardReactionUtils'

/**
 * Tests for useAlbumCardReactions hook logic
 * This tests the pure business logic without DOM rendering
 */

describe('useAlbumCardReactions Logic', () => {
  const mockReactions: Reaction[] = [
    { id: 'reaction-1', type: '❤️', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' },
    { id: 'reaction-2', type: '😂', author: 'user2@example.com', createdAt: '2024-01-01T11:00:00Z' },
    { id: 'reaction-3', type: '❤️', author: 'user3@example.com', createdAt: '2024-01-01T12:00:00Z' },
    { id: 'reaction-4', type: '👍', author: 'user1@example.com', createdAt: '2024-01-01T13:00:00Z' }
  ]

  describe('filterUserReactions', () => {
    it('should filter reactions for specific user', () => {
      const result = filterUserReactions(mockReactions, 'user1@example.com')
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('reaction-1')
      expect(result[1].id).toBe('reaction-4')
    })

    it('should return empty array when no user email', () => {
      const result = filterUserReactions(mockReactions, undefined)
      
      expect(result).toEqual([])
    })

    it('should return empty array when user has no reactions', () => {
      const result = filterUserReactions(mockReactions, 'nonexistent@example.com')
      
      expect(result).toEqual([])
    })
  })

  describe('canUserReact', () => {
    it('should return true when user and albumId are provided', () => {
      const user = { email: 'test@example.com' }
      expect(canUserReact(user, 'album-123')).toBe(true)
    })

    it('should return false when user is null', () => {
      expect(canUserReact(null, 'album-123')).toBe(false)
    })

    it('should return false when user has no email', () => {
      const user = { email: undefined }
      expect(canUserReact(user, 'album-123')).toBe(false)
    })

    it('should return false when albumId is undefined', () => {
      const user = { email: 'test@example.com' }
      expect(canUserReact(user, undefined)).toBe(false)
    })
  })

  describe('canProcessReactionClick', () => {
    it('should return true when all prerequisites are met', () => {
      expect(canProcessReactionClick('test@example.com', 'album-123', false)).toBe(true)
    })

    it('should return false when userEmail is missing', () => {
      expect(canProcessReactionClick(undefined, 'album-123', false)).toBe(false)
    })

    it('should return false when albumId is missing', () => {
      expect(canProcessReactionClick('test@example.com', undefined, false)).toBe(false)
    })

    it('should return false when updating', () => {
      expect(canProcessReactionClick('test@example.com', 'album-123', true)).toBe(false)
    })
  })

  describe('hasUserReacted', () => {
    it('should return true when user has reacted with emoji', () => {
      expect(hasUserReacted(mockReactions, 'user1@example.com', '❤️')).toBe(true)
      expect(hasUserReacted(mockReactions, 'user1@example.com', '👍')).toBe(true)
    })

    it('should return false when user has not reacted with emoji', () => {
      expect(hasUserReacted(mockReactions, 'user1@example.com', '😂')).toBe(false)
      expect(hasUserReacted(mockReactions, 'nonexistent@example.com', '❤️')).toBe(false)
    })
  })

  describe('addReactionOptimistically', () => {
    it('should add reaction to existing array', () => {
      const newReaction = createTemporaryReaction('🔥', 'user4@example.com')
      const result = addReactionOptimistically(mockReactions, newReaction)
      
      expect(result).toHaveLength(mockReactions.length + 1)
      expect(result[result.length - 1]).toBe(newReaction)
    })

    it('should not mutate original array', () => {
      const originalLength = mockReactions.length
      const newReaction = createTemporaryReaction('🔥', 'user4@example.com')
      
      addReactionOptimistically(mockReactions, newReaction)
      
      expect(mockReactions).toHaveLength(originalLength)
    })
  })

  describe('removeReactionOptimistically', () => {
    it('should remove reaction by id', () => {
      const result = removeReactionOptimistically(mockReactions, 'reaction-2')
      
      expect(result).toHaveLength(mockReactions.length - 1)
      expect(result.find(r => r.id === 'reaction-2')).toBeUndefined()
    })

    it('should handle nonexistent id gracefully', () => {
      const result = removeReactionOptimistically(mockReactions, 'nonexistent-id')
      
      expect(result).toHaveLength(mockReactions.length)
    })
  })

  describe('createTemporaryReaction', () => {
    it('should create reaction with correct properties', () => {
      const emoji = '🎉'
      const userEmail = 'test@example.com'
      
      const result = createTemporaryReaction(emoji, userEmail)
      
      expect(result.type).toBe(emoji)
      expect(result.author).toBe(userEmail)
      expect(result.id).toMatch(/^temp-\d+$/)
    })

    it('should create valid temporary reactions with temp id pattern', () => {
      const reaction1 = createTemporaryReaction('🔥', 'user1@example.com')
      const reaction2 = createTemporaryReaction('🎉', 'user2@example.com')
      
      // Both should have temp id pattern
      expect(reaction1.id).toMatch(/^temp-\d+$/)
      expect(reaction2.id).toMatch(/^temp-\d+$/)
      
      // Should have correct emoji and user assignments
      expect(reaction1.type).toBe('🔥')
      expect(reaction1.author).toBe('user1@example.com')
      expect(reaction2.type).toBe('🎉')
      expect(reaction2.author).toBe('user2@example.com')
    })
  })
})
