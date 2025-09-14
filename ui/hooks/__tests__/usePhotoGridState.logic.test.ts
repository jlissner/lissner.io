import { describe, it, expect } from 'vitest'
import {
  togglePhotoInSet,
  isPhotoExpanded,
  addPhotoToExpandedSet,
  removePhotoFromExpandedSet,
  getExpandedCount,
  hasExpandedPhotos,
  clearExpandedPhotos,
  getExpandedPhotoIds
} from '../../utils/photoGridStateUtils'

/**
 * Tests for usePhotoGridState hook logic
 * This tests the pure business logic without DOM rendering
 */

describe('usePhotoGridState Logic', () => {
  describe('togglePhotoInSet', () => {
    it('should add photo when not in set', () => {
      const currentSet = new Set(['photo1', 'photo2'])
      const result = togglePhotoInSet('photo3', currentSet)
      
      expect(result.has('photo3')).toBe(true)
      expect(result.has('photo1')).toBe(true)
      expect(result.has('photo2')).toBe(true)
      expect(result.size).toBe(3)
    })

    it('should remove photo when already in set', () => {
      const currentSet = new Set(['photo1', 'photo2', 'photo3'])
      const result = togglePhotoInSet('photo2', currentSet)
      
      expect(result.has('photo2')).toBe(false)
      expect(result.has('photo1')).toBe(true)
      expect(result.has('photo3')).toBe(true)
      expect(result.size).toBe(2)
    })

    it('should not mutate original set', () => {
      const currentSet = new Set(['photo1'])
      const originalSize = currentSet.size
      
      togglePhotoInSet('photo2', currentSet)
      
      expect(currentSet.size).toBe(originalSize)
      expect(currentSet.has('photo2')).toBe(false)
    })

    it('should handle empty set', () => {
      const currentSet = new Set<string>()
      const result = togglePhotoInSet('photo1', currentSet)
      
      expect(result.has('photo1')).toBe(true)
      expect(result.size).toBe(1)
    })
  })

  describe('isPhotoExpanded', () => {
    it('should return true when photo is in expanded set', () => {
      const expandedSet = new Set(['photo1', 'photo2'])
      
      expect(isPhotoExpanded('photo1', expandedSet)).toBe(true)
      expect(isPhotoExpanded('photo2', expandedSet)).toBe(true)
    })

    it('should return false when photo is not in expanded set', () => {
      const expandedSet = new Set(['photo1', 'photo2'])
      
      expect(isPhotoExpanded('photo3', expandedSet)).toBe(false)
    })

    it('should handle empty set', () => {
      const expandedSet = new Set<string>()
      
      expect(isPhotoExpanded('photo1', expandedSet)).toBe(false)
    })
  })

  describe('addPhotoToExpandedSet', () => {
    it('should add photo to set', () => {
      const currentSet = new Set(['photo1'])
      const result = addPhotoToExpandedSet('photo2', currentSet)
      
      expect(result.has('photo1')).toBe(true)
      expect(result.has('photo2')).toBe(true)
      expect(result.size).toBe(2)
    })

    it('should handle adding existing photo', () => {
      const currentSet = new Set(['photo1'])
      const result = addPhotoToExpandedSet('photo1', currentSet)
      
      expect(result.has('photo1')).toBe(true)
      expect(result.size).toBe(1)
    })

    it('should not mutate original set', () => {
      const currentSet = new Set(['photo1'])
      const originalSize = currentSet.size
      
      addPhotoToExpandedSet('photo2', currentSet)
      
      expect(currentSet.size).toBe(originalSize)
    })
  })

  describe('removePhotoFromExpandedSet', () => {
    it('should remove photo from set', () => {
      const currentSet = new Set(['photo1', 'photo2'])
      const result = removePhotoFromExpandedSet('photo1', currentSet)
      
      expect(result.has('photo1')).toBe(false)
      expect(result.has('photo2')).toBe(true)
      expect(result.size).toBe(1)
    })

    it('should handle removing nonexistent photo', () => {
      const currentSet = new Set(['photo1'])
      const result = removePhotoFromExpandedSet('photo2', currentSet)
      
      expect(result.has('photo1')).toBe(true)
      expect(result.size).toBe(1)
    })

    it('should not mutate original set', () => {
      const currentSet = new Set(['photo1', 'photo2'])
      const originalSize = currentSet.size
      
      removePhotoFromExpandedSet('photo1', currentSet)
      
      expect(currentSet.size).toBe(originalSize)
      expect(currentSet.has('photo1')).toBe(true)
    })
  })

  describe('getExpandedCount', () => {
    it('should return correct count', () => {
      expect(getExpandedCount(new Set(['photo1', 'photo2', 'photo3']))).toBe(3)
      expect(getExpandedCount(new Set(['photo1']))).toBe(1)
      expect(getExpandedCount(new Set())).toBe(0)
    })
  })

  describe('hasExpandedPhotos', () => {
    it('should return true when set has photos', () => {
      expect(hasExpandedPhotos(new Set(['photo1']))).toBe(true)
      expect(hasExpandedPhotos(new Set(['photo1', 'photo2']))).toBe(true)
    })

    it('should return false when set is empty', () => {
      expect(hasExpandedPhotos(new Set())).toBe(false)
    })
  })

  describe('clearExpandedPhotos', () => {
    it('should return empty set', () => {
      const result = clearExpandedPhotos()
      
      expect(result.size).toBe(0)
      expect(result).toBeInstanceOf(Set)
    })
  })

  describe('getExpandedPhotoIds', () => {
    it('should return array of photo IDs', () => {
      const expandedSet = new Set(['photo3', 'photo1', 'photo2'])
      const result = getExpandedPhotoIds(expandedSet)
      
      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(3)
      expect(result).toContain('photo1')
      expect(result).toContain('photo2')
      expect(result).toContain('photo3')
    })

    it('should return empty array for empty set', () => {
      const result = getExpandedPhotoIds(new Set())
      
      expect(result).toEqual([])
    })
  })

  describe('integration: comment expansion workflow', () => {
    it('should handle complete toggle workflow', () => {
      let expandedSet = new Set<string>()
      
      // Start with no expanded photos
      expect(hasExpandedPhotos(expandedSet)).toBe(false)
      expect(getExpandedCount(expandedSet)).toBe(0)
      
      // Add photo1
      expandedSet = togglePhotoInSet('photo1', expandedSet)
      expect(isPhotoExpanded('photo1', expandedSet)).toBe(true)
      expect(hasExpandedPhotos(expandedSet)).toBe(true)
      expect(getExpandedCount(expandedSet)).toBe(1)
      
      // Add photo2
      expandedSet = addPhotoToExpandedSet('photo2', expandedSet)
      expect(getExpandedCount(expandedSet)).toBe(2)
      expect(getExpandedPhotoIds(expandedSet)).toEqual(expect.arrayContaining(['photo1', 'photo2']))
      
      // Toggle photo1 off
      expandedSet = togglePhotoInSet('photo1', expandedSet)
      expect(isPhotoExpanded('photo1', expandedSet)).toBe(false)
      expect(isPhotoExpanded('photo2', expandedSet)).toBe(true)
      expect(getExpandedCount(expandedSet)).toBe(1)
      
      // Clear all
      expandedSet = clearExpandedPhotos()
      expect(hasExpandedPhotos(expandedSet)).toBe(false)
      expect(getExpandedPhotoIds(expandedSet)).toEqual([])
    })
  })
})