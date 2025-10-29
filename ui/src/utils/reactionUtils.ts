/**
 * Reaction and comment utility functions
 * All functions in this file are covered by tests in components/__tests__/reaction-utils.test.ts
 */

export interface Reaction {
  id: string
  type: string
  author: string
  createdAt: string
}

export interface Comment {
  id: string
  content: string
  author: string
  createdAt: string
}

/**
 * Count reactions by type
 */
export function countReactionsByType(reactions: Reaction[]): Record<string, number> {
  return reactions.reduce((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Get the top reaction types with their counts (for display)
 * @param reactions - Array of reactions
 * @param maxTypes - Maximum number of reaction types to return
 */
export function getTopReactionTypes(
  reactions: Reaction[], 
  maxTypes: number = 2
): Array<{ type: string; count: number }> {
  const counts = countReactionsByType(reactions)
  
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count) // Sort by count descending
    .slice(0, maxTypes)
}

/**
 * Calculate if there are overflow reactions beyond the displayed types
 */
export function calculateReactionOverflow(
  reactions: Reaction[], 
  displayedTypes: string[]
): { hasOverflow: boolean; overflowCount: number } {
  const totalReactions = reactions.length
  const displayedReactions = reactions.filter(r => displayedTypes.includes(r.type)).length
  const overflowCount = totalReactions - displayedReactions
  
  return {
    hasOverflow: overflowCount > 0,
    overflowCount
  }
}

/**
 * Get reactions summary for display (emoji + count, with overflow)
 */
export function getReactionSummary(
  reactions: Reaction[],
  maxDisplayTypes: number = 2
): {
  topTypes: Array<{ type: string; count: number }>
  hasOverflow: boolean
  overflowCount: number
  totalCount: number
} {
  const topTypes = getTopReactionTypes(reactions, maxDisplayTypes)
  const displayedTypes = topTypes.map(t => t.type)
  const overflow = calculateReactionOverflow(reactions, displayedTypes)
  
  return {
    topTypes,
    hasOverflow: overflow.hasOverflow,
    overflowCount: overflow.overflowCount,
    totalCount: reactions.length
  }
}

/**
 * Check if a user has reacted with a specific emoji
 */
export function hasUserReacted(
  reactions: Reaction[], 
  userEmail: string, 
  emojiType: string
): boolean {
  return reactions.some(r => r.author === userEmail && r.type === emojiType)
}

/**
 * Get all reaction types by a specific user
 */
export function getUserReactionTypes(
  reactions: Reaction[], 
  userEmail: string
): string[] {
  return reactions
    .filter(r => r.author === userEmail)
    .map(r => r.type)
}

/**
 * Filter reactions by user
 */
export function getReactionsByUser(
  reactions: Reaction[], 
  userEmail: string
): Reaction[] {
  return reactions.filter(r => r.author === userEmail)
}

/**
 * Sort comments by creation date (newest first by default)
 */
export function sortComments(
  comments: Comment[], 
  order: 'asc' | 'desc' = 'desc'
): Comment[] {
  return [...comments].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return order === 'asc' ? dateA - dateB : dateB - dateA
  })
}

/**
 * Get comments by user
 */
export function getCommentsByUser(
  comments: Comment[], 
  userEmail: string
): Comment[] {
  return comments.filter(c => c.author === userEmail)
}

/**
 * Format comment date for display
 */
export function formatCommentDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

/**
 * Calculate total activity count (comments + reactions)
 */
export function getTotalActivityCount(
  comments: Comment[], 
  reactions: Reaction[]
): number {
  return comments.length + reactions.length
}

/**
 * Check if user can delete a comment (is the author)
 */
export function canUserDeleteComment(
  comment: Comment, 
  userEmail: string
): boolean {
  return comment.author === userEmail
}

/**
 * Check if user can delete a reaction (is the author)
 */
export function canUserDeleteReaction(
  reaction: Reaction, 
  userEmail: string
): boolean {
  return reaction.author === userEmail
}

/**
 * Get unique authors from reactions and comments
 */
export function getUniqueAuthors(
  comments: Comment[], 
  reactions: Reaction[]
): string[] {
  const allAuthors = [
    ...comments.map(c => c.author),
    ...reactions.map(r => r.author)
  ]
  return [...new Set(allAuthors)]
}

/**
 * Calculate photos to show in group card (business logic)
 */
export function calculatePhotosToShow(
  totalPhotos: number, 
  availablePhotos: number
): number {
  // Special case: if exactly 6 photos, show all 6
  if (totalPhotos === 6) {
    return 6
  }
  
  // Otherwise, show up to 5 photos
  return Math.min(5, availablePhotos)
}
