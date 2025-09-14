/**
 * Utility functions for album card reaction management
 */

export interface Reaction {
  id: string
  type: string
  author: string
  createdAt: string
}

/**
 * Filters reactions to get only those from a specific user
 */
export const filterUserReactions = (reactions: Reaction[], userEmail?: string): Reaction[] => {
  if (!userEmail) return []
  return reactions.filter(r => r.author === userEmail)
}

/**
 * Finds an existing reaction by user and emoji type
 */
export const findExistingReaction = (reactions: Reaction[], userEmail: string, emoji: string): Reaction | undefined => {
  return reactions.find(r => r.author === userEmail && r.type === emoji)
}

/**
 * Checks if a user has reacted with a specific emoji
 */
export const hasUserReacted = (reactions: Reaction[], userEmail: string, emoji: string): boolean => {
  return !!findExistingReaction(reactions, userEmail, emoji)
}

/**
 * Determines if a user can react (has email and album is specified)
 */
export const canUserReact = (user: { email?: string } | null, albumId?: string): boolean => {
  return !!(user?.email && albumId)
}

/**
 * Adds a reaction to the reactions array without mutating the original
 */
export const addReactionOptimistically = (reactions: Reaction[], newReaction: Reaction): Reaction[] => {
  return [...reactions, newReaction]
}

/**
 * Removes a reaction from the reactions array without mutating the original
 */
export const removeReactionOptimistically = (reactions: Reaction[], reactionId: string): Reaction[] => {
  return reactions.filter(r => r.id !== reactionId)
}

/**
 * Creates a temporary reaction object for optimistic updates
 */
export const createTemporaryReaction = (emoji: string, userEmail: string): Reaction => {
  return {
    id: `temp-${Date.now()}`,
    type: emoji,
    author: userEmail,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Validates reaction click prerequisites
 */
export const canProcessReactionClick = (
  userEmail?: string,
  albumId?: string,
  isUpdating?: boolean
): boolean => {
  return !!(userEmail && albumId && !isUpdating)
}
