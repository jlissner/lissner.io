import { useState, useEffect } from 'react'
import { addComment, deleteComment, addReaction, removeReaction, addTag, removeTag, deletePhoto } from '../../lib/api'
import toast from 'react-hot-toast'
import { Photo, Comment, Reaction } from '../../types/photo'

interface UsePhotoActionsProps {
  photo: Photo
  userEmail?: string
  isAdmin: boolean
  onUpdate: () => void
  onDelete?: () => void
}

export const usePhotoActions = ({
  photo,
  userEmail,
  isAdmin,
  onUpdate,
  onDelete
}: UsePhotoActionsProps) => {
  // Local state for optimistic updates
  const [localTags, setLocalTags] = useState<string[]>(photo.tags || [])
  const [localComments, setLocalComments] = useState<Comment[]>(photo.comments || [])
  const [localReactions, setLocalReactions] = useState<Reaction[]>(photo.reactions || [])
  
  // Form state
  const [newComment, setNewComment] = useState('')
  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync with photo prop changes
  useEffect(() => {
    setLocalTags(photo.tags || [])
    setLocalComments(photo.comments || [])
    setLocalReactions(photo.reactions || [])
  }, [photo.tags, photo.comments, photo.reactions])

  // Derived state - find all user reactions
  const userReactions = localReactions.filter(r => r.author === userEmail)
  const canDelete = userEmail === photo.uploadedBy || isAdmin

  // Comment actions
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const commentContent = newComment.trim()
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      content: commentContent,
      author: userEmail || '',
      createdAt: new Date().toISOString(),
    }

    // Optimistic update
    setLocalComments(prev => [...prev, tempComment])
    setNewComment('')
    setIsLoading(true)
    
    try {
      const result = await addComment(photo.id, commentContent)
      setLocalComments(prev => prev.map(comment => 
        comment.id === tempComment.id ? result.comment : comment
      ))
      // Don't call onUpdate() to avoid screen flash - rely on optimistic updates
      toast.success('Comment added!')
    } catch (error) {
      // Revert on error
      setLocalComments(prev => prev.filter(comment => comment.id !== tempComment.id))
      setNewComment(commentContent)
      toast.error('Failed to add comment')
    } finally {
      setIsLoading(false)
    }
  }

  // Reaction actions
  const handleReaction = async (type: string) => {
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
        await removeReaction(photo.id, existingReaction.id)
      } else {
        await addReaction(photo.id, type)
      }
      // Don't call onUpdate() to avoid screen flash - rely on optimistic updates
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
    const commentToDelete = localComments.find(c => c.id === commentId)
    if (!commentToDelete) return

    // Optimistic update - remove comment immediately
    setLocalComments(prev => prev.filter(c => c.id !== commentId))

    try {
      await deleteComment(photo.id, commentId)
      toast.success('Comment deleted!')
    } catch (error) {
      // Revert on error
      setLocalComments(prev => [...prev, commentToDelete].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ))
      toast.error('Failed to delete comment')
    }
  }

  // Tag actions
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTag.trim()) return

    const tagToAdd = newTag.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!tagToAdd || localTags.includes(tagToAdd)) {
      setNewTag('')
      return
    }

    // Optimistic update
    setLocalTags(prev => [...prev, tagToAdd])
    setNewTag('')
    setIsLoading(true)

    try {
      await addTag(photo.id, tagToAdd)
      // Don't call onUpdate() to avoid screen flash - rely on optimistic updates
      toast.success('Tag added!')
    } catch (error) {
      // Revert on error
      setLocalTags(prev => prev.filter(tag => tag !== tagToAdd))
      setNewTag(tagToAdd)
      toast.error('Failed to add tag')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    // Optimistic update
    setLocalTags(prev => prev.filter(tag => tag !== tagToRemove))

    try {
      await removeTag(photo.id, tagToRemove)
      // Don't call onUpdate() to avoid screen flash - rely on optimistic updates
      toast.success('Tag removed!')
    } catch (error) {
      // Revert on error
      setLocalTags(prev => [...prev, tagToRemove])
      toast.error('Failed to remove tag')
    }
  }

  // Delete action
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await deletePhoto(photo.id)
      toast.success('Photo deleted successfully')
      if (onDelete) onDelete()
    } catch (error) {
      toast.error('Failed to delete photo')
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    // State
    localTags,
    localComments,
    localReactions,
    newComment,
    newTag,
    isLoading,
    isDeleting,
    userReactions,
    canDelete,
    
    // Actions
    handleAddComment,
    handleDeleteComment,
    handleReaction,
    handleAddTag,
    handleRemoveTag,
    handleDelete,
    
    // Form setters
    setNewComment,
    setNewTag
  }
} 