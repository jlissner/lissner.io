import { useState } from 'react'
import { addAlbumReaction, removeAlbumReaction } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import toast from 'react-hot-toast'
import {
  filterUserReactions,
  findExistingReaction,
  canProcessReactionClick,
  createTemporaryReaction,
  type Reaction
} from '../utils/albumCardReactionUtils'

interface UseAlbumCardReactionsProps {
  albumId?: string
  initialReactions: Reaction[]
}

export const useAlbumCardReactions = ({ albumId, initialReactions }: UseAlbumCardReactionsProps) => {
  const { user } = useAuth()
  
  // Local state for optimistic updates
  const [localReactions, setLocalReactions] = useState<Reaction[]>(initialReactions)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isUpdatingReaction, setIsUpdatingReaction] = useState(false)
  
  // Get user's reactions
  const userReactions = filterUserReactions(localReactions, user?.email)
  
  // Handle clicking on existing reaction (toggle on/off)
  const handleReactionClick = async (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the album
    if (!canProcessReactionClick(user?.email, albumId, isUpdatingReaction)) return
    
    setIsUpdatingReaction(true)
    
    // Check if user already has this specific reaction type
    const existingReaction = findExistingReaction(localReactions, user.email!, emoji)
    
    if (existingReaction) {
      // Remove this specific reaction
      setLocalReactions(prev => prev.filter(r => r.id !== existingReaction.id))
    } else {
      // Add new reaction
      const newReaction = createTemporaryReaction(emoji, user.email!)
      setLocalReactions(prev => [...prev, newReaction])
    }

    try {
      if (existingReaction) {
        await removeAlbumReaction(albumId, existingReaction.id)
      } else {
        await addAlbumReaction(albumId, emoji)
      }
    } catch (error) {
      // Revert on error
      if (existingReaction) {
        setLocalReactions(prev => [...prev, existingReaction])
      } else {
        setLocalReactions(prev => prev.filter(r => r.author !== user.email && r.type !== emoji))
      }
      toast.error('Failed to update reaction')
    } finally {
      setIsUpdatingReaction(false)
    }
  }
  
  // Handle adding new reaction from emoji picker
  const handleEmojiSelect = async (emoji: string) => {
    setShowEmojiPicker(false)
    if (!canProcessReactionClick(user?.email, albumId, isUpdatingReaction)) return
    
    setIsUpdatingReaction(true)
    
    // Check if user already has this reaction
    const existingReaction = findExistingReaction(localReactions, user.email!, emoji)
    
    if (existingReaction) {
      // If they already have this reaction, just close the picker
      setIsUpdatingReaction(false)
      return
    }
    
    // Add new reaction
    const newReaction = createTemporaryReaction(emoji, user.email!)
    setLocalReactions(prev => [...prev, newReaction])

    try {
      await addAlbumReaction(albumId, emoji)
    } catch (error) {
      // Revert on error
      setLocalReactions(prev => prev.filter(r => r.author !== user.email && r.type !== emoji))
      toast.error('Failed to add reaction')
    } finally {
      setIsUpdatingReaction(false)
    }
  }

  return {
    localReactions,
    userReactions,
    showEmojiPicker,
    setShowEmojiPicker,
    isUpdatingReaction,
    handleReactionClick,
    handleEmojiSelect,
    canReact: !!(user && albumId)
  }
}
