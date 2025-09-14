/**
 * Utility functions for album reaction processing and display
 */

export interface Reaction {
  id: string
  type: string
  author: string
  createdAt: string
}

/**
 * Groups reactions by emoji type and counts them
 */
export const groupReactionsByType = (reactions: Reaction[]): Record<string, number> => {
  return reactions.reduce((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Sorts reaction entries by count (highest first)
 */
export const sortReactionsByCount = (reactionCounts: Record<string, number>): [string, number][] => {
  const entries = Object.entries(reactionCounts)
  return entries.sort(([,a], [,b]) => b - a)
}

/**
 * Checks if a user has reacted with a specific emoji
 */
export const hasUserReactedWithEmoji = (userReactions: Reaction[], emoji: string): boolean => {
  return userReactions.some(r => r.type === emoji)
}

/**
 * Gets the CSS classes for a reaction button based on user interaction state
 */
export const getReactionButtonClasses = (
  hasUserReacted: boolean,
  isUpdating: boolean,
  canReact: boolean
): string => {
  const baseClasses = 'flex items-center space-x-1 rounded px-2 py-1 transition-colors disabled:opacity-50'
  
  if (!canReact || isUpdating) {
    return `${baseClasses} opacity-50`
  }
  
  if (hasUserReacted) {
    return `${baseClasses} bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300`
  }
  
  return `${baseClasses} bg-gray-100 hover:bg-gray-200 border border-gray-200`
}

/**
 * Processes reactions to get sorted entries with user interaction info
 */
export const processReactionsForDisplay = (
  reactions: Reaction[],
  userReactions: Reaction[]
): Array<{ emoji: string; count: number; hasUserReacted: boolean }> => {
  const reactionCounts = groupReactionsByType(reactions)
  const sortedEntries = sortReactionsByCount(reactionCounts)
  
  return sortedEntries.map(([emoji, count]) => ({
    emoji,
    count,
    hasUserReacted: hasUserReactedWithEmoji(userReactions, emoji)
  }))
}
