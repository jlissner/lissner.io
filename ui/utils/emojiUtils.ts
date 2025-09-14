/**
 * Emoji utility functions
 * All functions in this file are covered by tests in components/__tests__/emoji-utils.test.ts
 */

export interface EmojiData {
  emoji: string
  keywords: string[]
}

/**
 * Filter emojis based on search term
 * Searches both emoji character and keywords
 */
export function filterEmojis(emojiData: EmojiData[], searchTerm: string): EmojiData[] {
  if (!searchTerm.trim()) return emojiData
  
  const term = searchTerm.toLowerCase()
  return emojiData.filter(item => 
    item.keywords.some(keyword => keyword.includes(term)) ||
    item.emoji.includes(term)
  )
}

/**
 * Calculate optimal position for emoji picker based on available space
 */
export function calculatePickerPosition(
  elementRect: DOMRect,
  viewportHeight: number,
  pickerHeight: number = 200
): 'top' | 'bottom' {
  const spaceBelow = viewportHeight - elementRect.top
  const spaceAbove = elementRect.top
  
  // If not enough space below but enough space above, position at top
  if (spaceBelow < pickerHeight && spaceAbove > pickerHeight) {
    return 'top'
  }
  
  return 'bottom'
}

/**
 * Check if a string contains emoji characters
 */
export function containsEmoji(text: string): boolean {
  // Simple regex to detect emoji characters
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
  return emojiRegex.test(text)
}

/**
 * Validate if a search term looks like a direct emoji input
 */
export function isDirectEmojiInput(searchTerm: string): boolean {
  const trimmed = searchTerm.trim()
  return trimmed.length > 0 && (
    containsEmoji(trimmed) || 
    trimmed.length <= 4 // Short strings might be emoji
  )
}
