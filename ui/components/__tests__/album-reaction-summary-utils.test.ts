import { describe, it, expect } from 'vitest'
import {
  groupReactionsByType,
  sortReactionsByCount,
  hasUserReactedWithEmoji,
  getReactionButtonClasses,
  processReactionsForDisplay,
  type Reaction
} from '../../utils/albumReactionUtils'

/**
 * Tests for AlbumReactionSummary utility logic
 * This tests the pure functions and data transformations used in the component
 */

describe('AlbumReactionSummary Utils', () => {
  const mockReactions: Reaction[] = [
    { id: 'r1', type: '❤️', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' },
    { id: 'r2', type: '😂', author: 'user2@example.com', createdAt: '2024-01-01T11:00:00Z' },
    { id: 'r3', type: '❤️', author: 'user3@example.com', createdAt: '2024-01-01T12:00:00Z' },
    { id: 'r4', type: '👍', author: 'user1@example.com', createdAt: '2024-01-01T13:00:00Z' },
    { id: 'r5', type: '❤️', author: 'user4@example.com', createdAt: '2024-01-01T14:00:00Z' },
    { id: 'r6', type: '😂', author: 'user5@example.com', createdAt: '2024-01-01T15:00:00Z' }
  ]

  describe('groupReactionsByType', () => {
    it('should group reactions by emoji type and count them', () => {
      const result = groupReactionsByType(mockReactions)
      
      expect(result).toEqual({
        '❤️': 3,
        '😂': 2,
        '👍': 1
      })
    })

    it('should handle empty reactions array', () => {
      const result = groupReactionsByType([])
      
      expect(result).toEqual({})
    })

    it('should handle single reaction', () => {
      const singleReaction = [mockReactions[0]]
      const result = groupReactionsByType(singleReaction)
      
      expect(result).toEqual({
        '❤️': 1
      })
    })

    it('should handle all same reaction type', () => {
      const sameReactions = [
        { id: 'r1', type: '🔥', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' },
        { id: 'r2', type: '🔥', author: 'user2@example.com', createdAt: '2024-01-01T11:00:00Z' },
        { id: 'r3', type: '🔥', author: 'user3@example.com', createdAt: '2024-01-01T12:00:00Z' }
      ]
      const result = groupReactionsByType(sameReactions)
      
      expect(result).toEqual({
        '🔥': 3
      })
    })
  })

  describe('sortReactionsByCount', () => {
    it('should sort reaction entries by count in descending order', () => {
      const reactionCounts = {
        '👍': 1,
        '❤️': 3,
        '😂': 2
      }
      
      const result = sortReactionsByCount(reactionCounts)
      
      expect(result).toEqual([
        ['❤️', 3],
        ['😂', 2],
        ['👍', 1]
      ])
    })

    it('should handle empty reaction counts', () => {
      const result = sortReactionsByCount({})
      
      expect(result).toEqual([])
    })

    it('should handle single reaction type', () => {
      const reactionCounts = { '❤️': 5 }
      const result = sortReactionsByCount(reactionCounts)
      
      expect(result).toEqual([['❤️', 5]])
    })

    it('should handle reactions with same count (stable sort)', () => {
      const reactionCounts = {
        'A': 2,
        'B': 2,
        'C': 2
      }
      
      const result = sortReactionsByCount(reactionCounts)
      
      // All should have count of 2, order may vary but counts should be correct
      expect(result).toHaveLength(3)
      expect(result.every(([, count]) => count === 2)).toBe(true)
      expect(result.map(([emoji]) => emoji).sort()).toEqual(['A', 'B', 'C'])
    })
  })

  describe('hasUserReactedWithEmoji', () => {
    const userReactions: Reaction[] = [
      { id: 'ur1', type: 'HEART', author: 'currentuser@example.com', createdAt: '2024-01-01T10:00:00Z' },
      { id: 'ur2', type: 'THUMBS_UP', author: 'currentuser@example.com', createdAt: '2024-01-01T11:00:00Z' }
    ]

    it('should return true when user has reacted with specific emoji', () => {
      expect(hasUserReactedWithEmoji(userReactions, 'HEART')).toBe(true)
      expect(hasUserReactedWithEmoji(userReactions, 'THUMBS_UP')).toBe(true)
    })

    it('should return false when user has not reacted with specific emoji', () => {
      expect(hasUserReactedWithEmoji(userReactions, 'LAUGH')).toBe(false)
      expect(hasUserReactedWithEmoji(userReactions, 'FIRE')).toBe(false)
    })

    it('should return false when user has no reactions', () => {
      expect(hasUserReactedWithEmoji([], 'HEART')).toBe(false)
    })

    it('should handle complex emoji correctly', () => {
      const complexUserReactions: Reaction[] = [
        { id: 'ur1', type: 'PARTY', author: 'user@example.com', createdAt: '2024-01-01T10:00:00Z' },
        { id: 'ur2', type: 'ROCKET', author: 'user@example.com', createdAt: '2024-01-01T11:00:00Z' }
      ]

      expect(hasUserReactedWithEmoji(complexUserReactions, 'PARTY')).toBe(true)
      expect(hasUserReactedWithEmoji(complexUserReactions, 'ROCKET')).toBe(true)
      expect(hasUserReactedWithEmoji(complexUserReactions, 'HEART')).toBe(false)
    })
  })

  describe('getReactionButtonClasses', () => {
    it('should return correct classes for user reacted state', () => {
      const result = getReactionButtonClasses(true, false, true)
      
      expect(result).toContain('bg-blue-100')
      expect(result).toContain('text-blue-700')
      expect(result).toContain('border-blue-300')
    })

    it('should return correct classes for not reacted state', () => {
      const result = getReactionButtonClasses(false, false, true)
      
      expect(result).toContain('bg-gray-100')
      expect(result).toContain('hover:bg-gray-200')
      expect(result).toContain('border-gray-200')
    })

    it('should return disabled classes when updating', () => {
      const result = getReactionButtonClasses(false, true, true)
      
      expect(result).toContain('opacity-50')
    })

    it('should return disabled classes when cannot react', () => {
      const result = getReactionButtonClasses(false, false, false)
      
      expect(result).toContain('opacity-50')
    })
  })

  describe('processReactionsForDisplay', () => {
    it('should process reactions correctly for display', () => {
      const userReactions = [
        { id: 'ur1', type: '❤️', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' }
      ]
      
      const result = processReactionsForDisplay(mockReactions, userReactions)
      
      expect(result).toEqual([
        { emoji: '❤️', count: 3, hasUserReacted: true },
        { emoji: '😂', count: 2, hasUserReacted: false },
        { emoji: '👍', count: 1, hasUserReacted: false }
      ])
    })

    it('should handle empty reactions', () => {
      const result = processReactionsForDisplay([], [])
      
      expect(result).toEqual([])
    })

    it('should handle no user reactions', () => {
      const result = processReactionsForDisplay(mockReactions, [])
      
      expect(result).toEqual([
        { emoji: '❤️', count: 3, hasUserReacted: false },
        { emoji: '😂', count: 2, hasUserReacted: false },
        { emoji: '👍', count: 1, hasUserReacted: false }
      ])
    })
  })

  describe('integration: full reaction processing workflow', () => {
    it('should process reactions from grouping to sorting correctly', () => {
      const userReactions = mockReactions.filter(r => r.author === 'user1@example.com')
      const result = processReactionsForDisplay(mockReactions, userReactions)
      
      // Should be sorted by count (highest first)
      expect(result[0].emoji).toBe('❤️')
      expect(result[0].count).toBe(3)
      expect(result[0].hasUserReacted).toBe(true)
      
      expect(result[1].emoji).toBe('😂')
      expect(result[1].count).toBe(2)
      expect(result[1].hasUserReacted).toBe(false)
      
      expect(result[2].emoji).toBe('👍')
      expect(result[2].count).toBe(1)
      expect(result[2].hasUserReacted).toBe(true)
    })

    it('should handle many different emoji types', () => {
      const manyReactions: Reaction[] = [
        { id: 'r1', type: '❤️', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' },
        { id: 'r2', type: '😂', author: 'user2@example.com', createdAt: '2024-01-01T11:00:00Z' },
        { id: 'r3', type: '👍', author: 'user3@example.com', createdAt: '2024-01-01T12:00:00Z' },
        { id: 'r4', type: '🔥', author: 'user4@example.com', createdAt: '2024-01-01T13:00:00Z' },
        { id: 'r5', type: '🎉', author: 'user5@example.com', createdAt: '2024-01-01T14:00:00Z' },
        { id: 'r6', type: '😍', author: 'user6@example.com', createdAt: '2024-01-01T15:00:00Z' },
        { id: 'r7', type: '🚀', author: 'user7@example.com', createdAt: '2024-01-01T16:00:00Z' }
      ]

      const result = processReactionsForDisplay(manyReactions, [])
      
      expect(result).toHaveLength(7)
      expect(result.every(({ count }) => count === 1)).toBe(true)
      expect(result.every(({ hasUserReacted }) => hasUserReacted === false)).toBe(true)
    })
  })
})