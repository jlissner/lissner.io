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
  setNewComment,
  setNewTag
}: PhotoSidebarProps) => {
  return (
    <div className="w-96 flex flex-col">
      {/* Photo Details */}
      <PhotoDetails photo={photo} />
      
      {/* Social Features */}
      <div className="p-4 space-y-6">
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
        />
      </div>
    </div>
  )
} 