import { describe, it, expect } from 'vitest'
import {
  filterEmojis,
  calculatePickerPosition,
  containsEmoji,
  isDirectEmojiInput,
  type EmojiData
} from '../../utils/emojiUtils'

// Test data
const mockEmojiData: EmojiData[] = [
  { emoji: '😂', keywords: ['laugh', 'crying', 'tears', 'joy', 'funny'] },
  { emoji: '❤️', keywords: ['heart', 'love', 'red', 'romance'] },
  { emoji: '🥰', keywords: ['love', 'hearts', 'adore', 'cute'] },
  { emoji: '😍', keywords: ['love', 'heart eyes', 'adore', 'crush'] },
  { emoji: '👍', keywords: ['thumbs up', 'like', 'good', 'yes'] },
  { emoji: '🚀', keywords: ['rocket', 'space', 'launch', 'fast'] },
  { emoji: '🎉', keywords: ['party', 'celebration', 'confetti', 'fun'] }
]

describe('Emoji Utils', () => {
  describe('filterEmojis', () => {
    it('should return all emojis when search term is empty', () => {
      expect(filterEmojis(mockEmojiData, '')).toEqual(mockEmojiData)
      expect(filterEmojis(mockEmojiData, '   ')).toEqual(mockEmojiData)
    })

    it('should filter emojis by keyword', () => {
      const result = filterEmojis(mockEmojiData, 'love')
      
      expect(result).toHaveLength(3)
      expect(result.map(e => e.emoji)).toEqual(['❤️', '🥰', '😍'])
    })

    it('should filter emojis by direct emoji search', () => {
      const result = filterEmojis(mockEmojiData, '❤️')
      
      expect(result).toHaveLength(1)
      expect(result[0].emoji).toBe('❤️')
    })

    it('should be case insensitive', () => {
      const result = filterEmojis(mockEmojiData, 'LOVE')
      
      expect(result).toHaveLength(3)
      expect(result.map(e => e.emoji)).toEqual(['❤️', '🥰', '😍'])
    })

    it('should handle partial keyword matches', () => {
      const result = filterEmojis(mockEmojiData, 'heart')
      
      expect(result).toHaveLength(3) // ❤️ (heart), 🥰 (hearts), 😍 (heart eyes)
      expect(result.map(e => e.emoji)).toContain('❤️')
      expect(result.map(e => e.emoji)).toContain('🥰')
      expect(result.map(e => e.emoji)).toContain('😍')
    })

    it('should return empty array when no matches found', () => {
      const result = filterEmojis(mockEmojiData, 'nonexistent')
      
      expect(result).toHaveLength(0)
    })

    it('should handle multiple word searches', () => {
      const result = filterEmojis(mockEmojiData, 'thumbs up')
      
      expect(result).toHaveLength(1)
      expect(result[0].emoji).toBe('👍')
    })
  })

  describe('calculatePickerPosition', () => {
    const mockRect = (top: number): DOMRect => ({
      top,
      left: 0,
      right: 100,
      bottom: top + 50,
      width: 100,
      height: 50,
      x: 0,
      y: top,
      toJSON: () => ({})
    })

    it('should return bottom when enough space below', () => {
      const rect = mockRect(100) // Element at 100px from top
      const viewportHeight = 500 // 400px space below
      
      const result = calculatePickerPosition(rect, viewportHeight, 200)
      expect(result).toBe('bottom')
    })

    it('should return top when not enough space below but enough above', () => {
      const rect = mockRect(400) // Element at 400px from top
      const viewportHeight = 500 // Only 100px space below, 400px above
      
      const result = calculatePickerPosition(rect, viewportHeight, 200)
      expect(result).toBe('top')
    })

    it('should return bottom when not enough space in either direction', () => {
      const rect = mockRect(150) // Element at 150px from top
      const viewportHeight = 300 // 150px above, 150px below
      
      const result = calculatePickerPosition(rect, viewportHeight, 200)
      expect(result).toBe('bottom') // Default to bottom
    })

    it('should handle custom picker height', () => {
      const rect = mockRect(100)
      const viewportHeight = 200
      
      expect(calculatePickerPosition(rect, viewportHeight, 50)).toBe('bottom')
      expect(calculatePickerPosition(rect, viewportHeight, 150)).toBe('bottom')
    })

    it('should handle edge case when element is at very top', () => {
      const rect = mockRect(0)
      const viewportHeight = 500
      
      const result = calculatePickerPosition(rect, viewportHeight, 200)
      expect(result).toBe('bottom')
    })

    it('should handle edge case when element is at very bottom', () => {
      const rect = mockRect(490)
      const viewportHeight = 500
      
      const result = calculatePickerPosition(rect, viewportHeight, 200)
      expect(result).toBe('top')
    })
  })

  describe('containsEmoji', () => {
    it('should detect emoji characters', () => {
      expect(containsEmoji('😂')).toBe(true)
      expect(containsEmoji('❤️')).toBe(true)
      expect(containsEmoji('🚀')).toBe(true)
      expect(containsEmoji('Hello 😊 world')).toBe(true)
    })

    it('should return false for text without emojis', () => {
      expect(containsEmoji('hello')).toBe(false)
      expect(containsEmoji('123')).toBe(false)
      expect(containsEmoji('')).toBe(false)
      expect(containsEmoji('text with :) emoticon')).toBe(false)
    })

    it('should handle mixed content', () => {
      expect(containsEmoji('Hello 👋')).toBe(true)
      expect(containsEmoji('Price: $10')).toBe(false)
    })
  })

  describe('isDirectEmojiInput', () => {
    it('should return true for emoji characters', () => {
      expect(isDirectEmojiInput('😂')).toBe(true)
      expect(isDirectEmojiInput('❤️')).toBe(true)
      expect(isDirectEmojiInput(' 🚀 ')).toBe(true) // With whitespace
    })

    it('should return true for short strings', () => {
      expect(isDirectEmojiInput('a')).toBe(true)
      expect(isDirectEmojiInput('ab')).toBe(true)
      expect(isDirectEmojiInput('abc')).toBe(true)
      expect(isDirectEmojiInput('abcd')).toBe(true)
    })

    it('should return false for longer text', () => {
      expect(isDirectEmojiInput('abcde')).toBe(false)
      expect(isDirectEmojiInput('hello')).toBe(false)
      expect(isDirectEmojiInput('search term')).toBe(false)
    })

    it('should return false for empty strings', () => {
      expect(isDirectEmojiInput('')).toBe(false)
      expect(isDirectEmojiInput('   ')).toBe(false)
    })
  })
})
