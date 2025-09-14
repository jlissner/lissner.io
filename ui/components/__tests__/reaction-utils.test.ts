import { describe, it, expect } from 'vitest'
import {
  countReactionsByType,
  getTopReactionTypes,
  calculateReactionOverflow,
  getReactionSummary,
  hasUserReacted,
  getUserReactionTypes,
  getReactionsByUser,
  sortComments,
  getCommentsByUser,
  formatCommentDate,
  getTotalActivityCount,
  canUserDeleteComment,
  canUserDeleteReaction,
  getUniqueAuthors,
  calculatePhotosToShow,
  type Reaction,
  type Comment
} from '../../utils/reactionUtils'

// Test data
const mockReactions: Reaction[] = [
  { id: '1', type: '❤️', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' },
  { id: '2', type: '❤️', author: 'user2@example.com', createdAt: '2024-01-01T11:00:00Z' },
  { id: '3', type: '😂', author: 'user3@example.com', createdAt: '2024-01-01T12:00:00Z' },
  { id: '4', type: '😂', author: 'user1@example.com', createdAt: '2024-01-01T13:00:00Z' },
  { id: '5', type: '👍', author: 'user2@example.com', createdAt: '2024-01-01T14:00:00Z' },
  { id: '6', type: '❤️', author: 'user3@example.com', createdAt: '2024-01-01T15:00:00Z' }
]

const mockComments: Comment[] = [
  { id: '1', content: 'Great photo!', author: 'user1@example.com', createdAt: '2024-01-01T10:00:00Z' },
  { id: '2', content: 'Love this!', author: 'user2@example.com', createdAt: '2024-01-02T10:00:00Z' },
  { id: '3', content: 'Amazing shot', author: 'user1@example.com', createdAt: '2024-01-03T10:00:00Z' }
]

describe('Reaction Utils', () => {
  describe('countReactionsByType', () => {
    it('should count reactions by type correctly', () => {
      const result = countReactionsByType(mockReactions)
      
      expect(result).toEqual({
        '❤️': 3,
        '😂': 2,
        '👍': 1
      })
    })

    it('should return empty object for empty array', () => {
      const result = countReactionsByType([])
      expect(result).toEqual({})
    })

    it('should handle single reaction', () => {
      const singleReaction = [mockReactions[0]]
      const result = countReactionsByType(singleReaction)
      
      expect(result).toEqual({ '❤️': 1 })
    })
  })

  describe('getTopReactionTypes', () => {
    it('should return top reaction types sorted by count', () => {
      const result = getTopReactionTypes(mockReactions, 2)
      
      expect(result).toEqual([
        { type: '❤️', count: 3 },
        { type: '😂', count: 2 }
      ])
    })

    it('should limit results to maxTypes', () => {
      const result = getTopReactionTypes(mockReactions, 1)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ type: '❤️', count: 3 })
    })

    it('should handle empty array', () => {
      const result = getTopReactionTypes([])
      expect(result).toEqual([])
    })

    it('should handle more maxTypes than available types', () => {
      const result = getTopReactionTypes(mockReactions, 10)
      
      expect(result).toHaveLength(3) // Only 3 unique types
      expect(result).toEqual([
        { type: '❤️', count: 3 },
        { type: '😂', count: 2 },
        { type: '👍', count: 1 }
      ])
    })

    it('should sort ties consistently', () => {
      const tiedReactions: Reaction[] = [
        { id: '1', type: '❤️', author: 'user1', createdAt: '2024-01-01' },
        { id: '2', type: '😂', author: 'user2', createdAt: '2024-01-01' }
      ]
      
      const result = getTopReactionTypes(tiedReactions, 2)
      
      expect(result).toHaveLength(2)
      expect(result[0].count).toBe(1)
      expect(result[1].count).toBe(1)
    })
  })

  describe('calculateReactionOverflow', () => {
    it('should calculate overflow correctly', () => {
      const result = calculateReactionOverflow(mockReactions, ['❤️', '😂'])
      
      expect(result).toEqual({
        hasOverflow: true,
        overflowCount: 1 // Only 👍 is not displayed
      })
    })

    it('should handle no overflow', () => {
      const result = calculateReactionOverflow(mockReactions, ['❤️', '😂', '👍'])
      
      expect(result).toEqual({
        hasOverflow: false,
        overflowCount: 0
      })
    })

    it('should handle empty reactions', () => {
      const result = calculateReactionOverflow([], ['❤️'])
      
      expect(result).toEqual({
        hasOverflow: false,
        overflowCount: 0
      })
    })

    it('should handle no displayed types', () => {
      const result = calculateReactionOverflow(mockReactions, [])
      
      expect(result).toEqual({
        hasOverflow: true,
        overflowCount: 6 // All reactions are overflow
      })
    })
  })

  describe('getReactionSummary', () => {
    it('should provide complete reaction summary', () => {
      const result = getReactionSummary(mockReactions, 2)
      
      expect(result).toEqual({
        topTypes: [
          { type: '❤️', count: 3 },
          { type: '😂', count: 2 }
        ],
        hasOverflow: true,
        overflowCount: 1,
        totalCount: 6
      })
    })

    it('should handle no overflow case', () => {
      const limitedReactions = mockReactions.filter(r => r.type !== '👍')
      const result = getReactionSummary(limitedReactions, 2)
      
      expect(result).toEqual({
        topTypes: [
          { type: '❤️', count: 3 },
          { type: '😂', count: 2 }
        ],
        hasOverflow: false,
        overflowCount: 0,
        totalCount: 5
      })
    })

    it('should handle empty reactions', () => {
      const result = getReactionSummary([])
      
      expect(result).toEqual({
        topTypes: [],
        hasOverflow: false,
        overflowCount: 0,
        totalCount: 0
      })
    })
  })

  describe('hasUserReacted', () => {
    it('should return true when user has reacted with specific emoji', () => {
      const result = hasUserReacted(mockReactions, 'user1@example.com', '❤️')
      expect(result).toBe(true)
    })

    it('should return false when user has not reacted with specific emoji', () => {
      const result = hasUserReacted(mockReactions, 'user1@example.com', '👍')
      expect(result).toBe(false)
    })

    it('should return false when user has not reacted at all', () => {
      const result = hasUserReacted(mockReactions, 'nonexistent@example.com', '❤️')
      expect(result).toBe(false)
    })

    it('should handle empty reactions', () => {
      const result = hasUserReacted([], 'user1@example.com', '❤️')
      expect(result).toBe(false)
    })
  })

  describe('getUserReactionTypes', () => {
    it('should return all reaction types by user', () => {
      const result = getUserReactionTypes(mockReactions, 'user1@example.com')
      
      expect(result).toEqual(['❤️', '😂'])
    })

    it('should return empty array when user has no reactions', () => {
      const result = getUserReactionTypes(mockReactions, 'nonexistent@example.com')
      expect(result).toEqual([])
    })

    it('should handle user with single reaction', () => {
      const result = getUserReactionTypes(mockReactions, 'user2@example.com')
      
      expect(result).toEqual(['❤️', '👍'])
    })
  })

  describe('getReactionsByUser', () => {
    it('should return all reactions by user', () => {
      const result = getReactionsByUser(mockReactions, 'user1@example.com')
      
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('❤️')
      expect(result[1].type).toBe('😂')
    })

    it('should return empty array when user has no reactions', () => {
      const result = getReactionsByUser(mockReactions, 'nonexistent@example.com')
      expect(result).toEqual([])
    })
  })

  describe('sortComments', () => {
    it('should sort comments by date descending by default', () => {
      const result = sortComments(mockComments)
      
      expect(result[0].id).toBe('3') // Newest first
      expect(result[1].id).toBe('2')
      expect(result[2].id).toBe('1') // Oldest last
    })

    it('should sort comments by date ascending when specified', () => {
      const result = sortComments(mockComments, 'asc')
      
      expect(result[0].id).toBe('1') // Oldest first
      expect(result[1].id).toBe('2')
      expect(result[2].id).toBe('3') // Newest last
    })

    it('should not mutate original array', () => {
      const original = [...mockComments]
      sortComments(mockComments, 'asc')
      
      expect(mockComments).toEqual(original)
    })

    it('should handle empty array', () => {
      const result = sortComments([])
      expect(result).toEqual([])
    })

    it('should handle single comment', () => {
      const singleComment = [mockComments[0]]
      const result = sortComments(singleComment)
      
      expect(result).toEqual(singleComment)
    })
  })

  describe('getCommentsByUser', () => {
    it('should return comments by specific user', () => {
      const result = getCommentsByUser(mockComments, 'user1@example.com')
      
      expect(result).toHaveLength(2)
      expect(result[0].content).toBe('Great photo!')
      expect(result[1].content).toBe('Amazing shot')
    })

    it('should return empty array when user has no comments', () => {
      const result = getCommentsByUser(mockComments, 'nonexistent@example.com')
      expect(result).toEqual([])
    })
  })

  describe('formatCommentDate', () => {
    it('should format recent dates correctly', () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
      const weekAgo = new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000)
      
      expect(formatCommentDate(today.toISOString())).toBe('Today')
      expect(formatCommentDate(yesterday.toISOString())).toBe('Yesterday')
      expect(formatCommentDate(threeDaysAgo.toISOString())).toBe('3 days ago')
      expect(formatCommentDate(weekAgo.toISOString())).toBe(weekAgo.toLocaleDateString())
    })
  })

  describe('getTotalActivityCount', () => {
    it('should count total comments and reactions', () => {
      const result = getTotalActivityCount(mockComments, mockReactions)
      expect(result).toBe(9) // 3 comments + 6 reactions
    })

    it('should handle empty arrays', () => {
      expect(getTotalActivityCount([], [])).toBe(0)
      expect(getTotalActivityCount(mockComments, [])).toBe(3)
      expect(getTotalActivityCount([], mockReactions)).toBe(6)
    })
  })

  describe('canUserDeleteComment', () => {
    it('should return true when user is comment author', () => {
      const result = canUserDeleteComment(mockComments[0], 'user1@example.com')
      expect(result).toBe(true)
    })

    it('should return false when user is not comment author', () => {
      const result = canUserDeleteComment(mockComments[0], 'user2@example.com')
      expect(result).toBe(false)
    })
  })

  describe('canUserDeleteReaction', () => {
    it('should return true when user is reaction author', () => {
      const result = canUserDeleteReaction(mockReactions[0], 'user1@example.com')
      expect(result).toBe(true)
    })

    it('should return false when user is not reaction author', () => {
      const result = canUserDeleteReaction(mockReactions[0], 'user2@example.com')
      expect(result).toBe(false)
    })
  })

  describe('getUniqueAuthors', () => {
    it('should return unique authors from comments and reactions', () => {
      const result = getUniqueAuthors(mockComments, mockReactions)
      
      expect(result).toHaveLength(3)
      expect(result).toContain('user1@example.com')
      expect(result).toContain('user2@example.com')
      expect(result).toContain('user3@example.com')
    })

    it('should handle empty arrays', () => {
      expect(getUniqueAuthors([], [])).toEqual([])
      expect(getUniqueAuthors(mockComments, [])).toEqual(['user1@example.com', 'user2@example.com'])
    })
  })

  describe('calculatePhotosToShow', () => {
    it('should return 6 when total photos is exactly 6', () => {
      expect(calculatePhotosToShow(6, 6)).toBe(6)
      expect(calculatePhotosToShow(6, 8)).toBe(6) // Even if more available
    })

    it('should return up to 5 photos for other cases', () => {
      expect(calculatePhotosToShow(10, 10)).toBe(5)
      expect(calculatePhotosToShow(3, 3)).toBe(3)
      expect(calculatePhotosToShow(7, 4)).toBe(4) // Limited by available
    })

    it('should handle edge cases', () => {
      expect(calculatePhotosToShow(0, 0)).toBe(0)
      expect(calculatePhotosToShow(1, 1)).toBe(1)
      expect(calculatePhotosToShow(5, 5)).toBe(5)
    })

    it('should prefer available photos when less than total', () => {
      expect(calculatePhotosToShow(10, 3)).toBe(3)
      expect(calculatePhotosToShow(7, 2)).toBe(2)
    })
  })
})
