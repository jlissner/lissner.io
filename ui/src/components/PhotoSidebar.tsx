'use client'

import { PhotoDetails } from './PhotoDetails'
import { PhotoReactions } from './PhotoReactions'
import { PhotoTags } from './PhotoTags'
import { PhotoComments } from './PhotoComments'

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

interface Photo {
  id: string
  caption?: string
  uploadedBy: string
  uploadedAt: string
  takenAt?: string | null
  location?: {
    latitude: number
    longitude: number
    altitude?: number | null
  } | null
  [key: string]: any
}

interface PhotoSidebarProps {
  photo: Photo
  // Social state
  localTags: string[]
  localComments: Comment[]
  localReactions: Reaction[]
  userReactions: Reaction[]
  // Form state
  newComment: string
  newTag: string
  isLoading: boolean
  // Actions
  handleReaction: (type: string) => void
  handleAddTag: (e: React.FormEvent) => void
  handleRemoveTag: (tag: string) => void
  handleAddComment: (e: React.FormEvent) => void
  handleDeleteComment: (commentId: string) => void
  setNewComment: (value: string) => void
  setNewTag: (value: string) => void
}

export const PhotoSidebar = ({
  photo,
  localTags,
  localComments,
  localReactions,
  userReactions,
  newComment,
  newTag,
  isLoading,
  handleReaction,
  handleAddTag,
  handleRemoveTag,
  handleAddComment,
  handleDeleteComment,
  setNewComment,
  setNewTag
}: PhotoSidebarProps) => {
  return (
    <div style={{ width: '24rem', display: 'flex', flexDirection: 'column' }}>
      {/* Photo Details */}
      <PhotoDetails photo={photo} />
      
      {/* Social Features */}
      <div data-stack="lg" style={{ padding: '1rem' }}>
        {/* Reactions */}
        <PhotoReactions
          reactions={localReactions}
          userReactions={userReactions}
          onReaction={handleReaction}
        />
        
        {/* Tags */}
        <PhotoTags
          tags={localTags}
          newTag={newTag}
          onNewTagChange={setNewTag}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
        
        {/* Comments */}
        <PhotoComments
          comments={localComments}
          newComment={newComment}
          isLoading={isLoading}
          onNewCommentChange={setNewComment}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      </div>
    </div>
  )
} 