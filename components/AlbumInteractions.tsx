'use client'

import { useState, useEffect } from 'react'
import { TrashIcon } from '@heroicons/react/24/outline'
import { EmojiPicker } from './EmojiPicker'
import { getUserColor, getUserInitials, getDisplayName, getRelativeTime } from './utils/photoUtils'
import { useAuth } from '@/lib/auth-context'

interface Comment {
  id: string
  content: string
  author: string
  createdAt: string
}

interface Reaction {
  id: string
  type: string
  author: string
  createdAt: string
}

interface AlbumActionsHook {
  localComments: Comment[]
  localReactions: Reaction[]
  userReactions: Reaction[]
  newComment: string
  setNewComment: (value: string) => void
  isLoading: boolean
  handleAddComment: (e: React.FormEvent) => void
  handleDeleteComment: (commentId: string) => void
  handleReaction: (type: string) => void
}

interface AlbumInteractionsProps {
  albumActions: AlbumActionsHook
}

export const AlbumInteractions = ({ albumActions }: AlbumInteractionsProps) => {
  const { user } = useAuth()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as Element
        if (!target.closest('.emoji-picker-container')) {
          setShowEmojiPicker(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Comments</h3>
      </div>

      {/* Comments - Fill remaining space */}
      <div className="flex-1 flex flex-col p-4">
        
        {/* Add Comment Form */}
        <form onSubmit={albumActions.handleAddComment} className="mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full ${getUserColor(user?.email || '')} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
              {getUserInitials(user?.email || '')}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={albumActions.newComment}
                onChange={(e) => albumActions.setNewComment(e.target.value)}
                placeholder="Add a comment to this album..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-500 bg-white"
                disabled={albumActions.isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!albumActions.newComment.trim() || albumActions.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {albumActions.isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>

        {/* Comments List - Fill remaining space */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {albumActions.localComments.length > 0 ? (
            albumActions.localComments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full ${getUserColor(comment.author)} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
                  {getUserInitials(comment.author)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900">
                          {getDisplayName(comment.author)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      {/* Delete button - only show for own comments or if admin */}
                      {(comment.author === user?.email || user?.isAdmin) && (
                        <button
                          onClick={() => albumActions.handleDeleteComment(comment.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded"
                          title="Delete comment"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No comments yet. Start the conversation!</p>
          )}
        </div>
      </div>
    </div>
  )
}
