import { useState, useEffect } from 'react'
import { addAlbumComment, deleteAlbumComment, addAlbumReaction, removeAlbumReaction } from '@/ui/lib/api'
import toast from 'react-hot-toast'

interface Comment {
  id: string
  content: string
  author: string
  createdAt: string
}

interface Reaction {
  id: string
  type: string // Changed to support any emoji
  author: string
  createdAt: string
}

interface UseAlbumActionsProps {
  albumId: string | undefined
  initialComments?: Comment[]
  initialReactions?: Reaction[]
  userEmail: string | undefined
  onUpdate: () => void
}

export const useAlbumActions = ({
  albumId,
  initialComments = [],
  initialReactions = [],
  userEmail,
  onUpdate
}: UseAlbumActionsProps) => {
  // Local state for optimistic updates
  const [localComments, setLocalComments] = useState<Comment[]>(initialComments)
  const [localReactions, setLocalReactions] = useState<Reaction[]>(initialReactions)
  
  // Form state
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Sync with prop changes
  useEffect(() => {
    setLocalComments(initialComments)
    setLocalReactions(initialReactions)
  }, [initialComments, initialReactions])

  // Derived state - find all user reactions
  const userReactions = localReactions.filter(r => r.author === userEmail)

  // Comment actions
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !albumId) return

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      content: newComment.trim(),
      author: userEmail || '',
      createdAt: new Date().toISOString(),
    }

    // Optimistic update
    setLocalComments(prev => [...prev, tempComment])
    setNewComment('')
    setIsLoading(true)

    try {
      const response = await addAlbumComment(albumId, newComment.trim())
      // Replace temp comment with real one
      setLocalComments(prev => 
        prev.map(comment => 
          comment.id === tempComment.id ? response.comment : comment
        )
      )
      toast.success('Comment added!')
      // Note: We rely on optimistic updates, no need for global refresh
    } catch (error) {
      // Revert on error
      setLocalComments(prev => prev.filter(comment => comment.id !== tempComment.id))
      setNewComment(tempComment.content)
      toast.error('Failed to add comment')
    } finally {
      setIsLoading(false)
    }
  }

  // Reaction actions
  const handleReaction = async (type: string) => {
    if (!albumId) return

    // Check if user already has this specific reaction type
    const existingReaction = localReactions.find(r => r.author === userEmail && r.type === type)
    
    if (existingReaction) {
      // Remove this specific reaction
      setLocalReactions(prev => prev.filter(r => r.id !== existingReaction.id))
    } else {
      // Add new reaction
      const newReaction: Reaction = {
        id: `temp-${Date.now()}`,
        type,
        author: userEmail || '',
        createdAt: new Date().toISOString(),
      }
      setLocalReactions(prev => [...prev, newReaction])
    }

    try {
      if (existingReaction) {
        await removeAlbumReaction(albumId, existingReaction.id)
      } else {
        await addAlbumReaction(albumId, type)
      }
      // Note: We rely on optimistic updates, no need for global refresh
    } catch (error) {
      // Revert on error
      if (existingReaction) {
        setLocalReactions(prev => [...prev, existingReaction])
      } else {
        setLocalReactions(prev => prev.filter(r => r.author !== userEmail && r.type !== type))
      }
      toast.error('Failed to update reaction')
    }
  }

  // Delete comment action
  const handleDeleteComment = async (commentId: string) => {
    if (!albumId) return

    const commentToDelete = localComments.find(c => c.id === commentId)
    if (!commentToDelete) return

    // Optimistic update - remove comment
    setLocalComments(prev => prev.filter(comment => comment.id !== commentId))

    try {
      await deleteAlbumComment(albumId, commentId)
      toast.success('Comment deleted!')
    } catch (error) {
      // Revert on error - add comment back
      setLocalComments(prev => [...prev, commentToDelete].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ))
      toast.error('Failed to delete comment')
    }
  }

  return {
    localComments,
    localReactions,
    userReactions,
    newComment,
    setNewComment,
    isLoading,
    handleAddComment,
    handleDeleteComment,
    handleReaction,
  }
}
